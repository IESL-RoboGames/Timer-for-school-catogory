package handlers

import (
	"context"
	"errors"
	"math"
	"net/http"
	"strings"
	"time"

	"robogames-timer/internal/models"
	"robogames-timer/internal/websocket"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const mongoOpTimeout = 5 * time.Second

type Handler struct {
	db          *mongo.Database
	hub         *websocket.Hub
	adminKey    string
	requireAuth bool
}

func NewHandler(db *mongo.Database, hub *websocket.Hub, adminKey string, requireAuth bool) *Handler {
	return &Handler{
		db:          db,
		hub:         hub,
		adminKey:    strings.TrimSpace(adminKey),
		requireAuth: requireAuth,
	}
}

func (h *Handler) authorizeAdmin(c *gin.Context) bool {
	if !h.requireAuth || h.adminKey == "" {
		return true
	}

	provided := strings.TrimSpace(c.GetHeader("X-Admin-Key"))
	if provided == "" {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		provided = strings.TrimPrefix(authHeader, "Bearer ")
	}

	if provided != h.adminKey {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return false
	}

	return true
}

func (h *Handler) StartTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) {
		return
	}

	var req struct {
		Team   string `json:"team"`
		Source string `json:"source"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	team := strings.TrimSpace(req.Team)
	if team == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team is required"})
		return
	}

	startTime := time.Now().UnixMilli()
	session := models.Session{
		Team:      team,
		StartTime: startTime,
		Status:    "running",
	}

	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer cancel()

	res, err := h.db.Collection("sessions").InsertOne(dbCtx, session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	event := models.Event{
		Type:       "START",
		Team:       team,
		Time:       startTime,
		Source:     fallbackSource(req.Source, "admin-http"),
		RecordedAt: time.Now().UnixMilli(),
	}
	_, _ = h.db.Collection("events").InsertOne(dbCtx, event)

	h.hub.Broadcast(gin.H{
		"event":     "START",
		"team":      team,
		"startTime": startTime,
		"sessionId": res.InsertedID,
	})

	c.JSON(http.StatusOK, session)
}

func (h *Handler) StopTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) {
		return
	}

	var req struct {
		StopTime  float64 `json:"stopTime"`
		RequestID string  `json:"requestId"`
		Source    string  `json:"source"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := h.ProcessStop(int64(math.Round(req.StopTime)), req.RequestID, req.Source)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusNotFound, gin.H{"error": "no running session found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, session)
}

func (h *Handler) ProcessStop(stopTime int64, requestID, source string) (*models.Session, error) {
	requestID = strings.TrimSpace(requestID)
	source = fallbackSource(source, "unknown")

	if requestID != "" {
		exists, err := h.stopEventExists(requestID)
		if err != nil {
			return nil, err
		}
		if exists {
			latest, err := h.getLatestSession()
			if err != nil {
				return nil, err
			}
			return latest, nil
		}
	}

	serverNow := time.Now().UnixMilli()
	if stopTime == 0 || stopTime > serverNow {
		stopTime = serverNow
	}

	// Update the latest running session
	filter := bson.M{"status": "running"}
	update := bson.M{
		"$set": bson.M{
			"endTime": stopTime,
			"status":  "finished",
		},
	}

	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer cancel()

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After).SetSort(bson.M{"_id": -1})
	var updatedSession models.Session
	err := h.db.Collection("sessions").FindOneAndUpdate(dbCtx, filter, update, opts).Decode(&updatedSession)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			latest, latestErr := h.getLatestSession()
			if latestErr == nil && latest.Status == "finished" {
				return latest, nil
			}
		}
		return nil, err
	}

	// Log event
	event := models.Event{
		Type:       "STOP",
		Team:       updatedSession.Team,
		Time:       stopTime,
		Source:     source,
		RequestID:  requestID,
		RecordedAt: time.Now().UnixMilli(),
	}

	insertCtx, insertCancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer insertCancel()
	_, _ = h.db.Collection("events").InsertOne(insertCtx, event)

	h.hub.Broadcast(gin.H{
		"event":     "STOP",
		"endTime":   stopTime,
		"team":      updatedSession.Team,
		"requestId": requestID,
		"source":    source,
	})

	return &updatedSession, nil
}

func (h *Handler) stopEventExists(requestID string) (bool, error) {
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer cancel()
	count, err := h.db.Collection("events").CountDocuments(dbCtx, bson.M{"type": "STOP", "requestId": requestID})
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (h *Handler) getLatestSession() (*models.Session, error) {
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer cancel()
	var session models.Session
	opts := options.FindOne().SetSort(bson.M{"_id": -1})
	err := h.db.Collection("sessions").FindOne(dbCtx, bson.M{}, opts).Decode(&session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (h *Handler) RecoverStateFromEvents() error {
	latest, err := h.getLatestSession()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil
		}
		return err
	}

	if latest.Status != "running" {
		return nil
	}

	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer cancel()

	filter := bson.M{
		"type": "STOP",
		"team": latest.Team,
		"time": bson.M{"$gte": latest.StartTime},
	}
	opts := options.FindOne().SetSort(bson.M{"time": -1, "_id": -1})
	var stopEvent models.Event
	err = h.db.Collection("events").FindOne(dbCtx, filter, opts).Decode(&stopEvent)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil
		}
		return err
	}

	if stopEvent.Time == 0 {
		return nil
	}

	updateCtx, updateCancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer updateCancel()
	_, err = h.db.Collection("sessions").UpdateByID(updateCtx, latest.ID, bson.M{
		"$set": bson.M{
			"status":  "finished",
			"endTime": stopEvent.Time,
		},
	})
	return err
}

func (h *Handler) GetState(c *gin.Context) {
	_ = h.RecoverStateFromEvents()

	serverTime := time.Now().UnixMilli()
	session, err := h.getLatestSession()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			c.JSON(http.StatusOK, gin.H{
				"serverTime": serverTime,
				"session":    nil,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":      err.Error(),
			"serverTime": serverTime,
			"session":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"serverTime": serverTime,
		"session":    session,
	})
}

func (h *Handler) ServeWs(c *gin.Context) {
	h.hub.ServeWs(c.Writer, c.Request)
}

func fallbackSource(value, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}
