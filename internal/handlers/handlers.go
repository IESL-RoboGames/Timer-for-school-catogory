package handlers

import (
	"context"
	"errors"
	"net/http"
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
	db  *mongo.Database
	hub *websocket.Hub
}

func NewHandler(db *mongo.Database, hub *websocket.Hub) *Handler {
	return &Handler{db: db, hub: hub}
}

func (h *Handler) StartTimer(c *gin.Context) {
	var req struct {
		Team string `json:"team"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startTime := time.Now().UnixMilli()
	session := models.Session{
		Team:      req.Team,
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

	h.hub.Broadcast(gin.H{
		"event":     "START",
		"team":      req.Team,
		"startTime": startTime,
		"sessionId": res.InsertedID,
	})

	c.JSON(http.StatusOK, session)
}

func (h *Handler) StopTimer(c *gin.Context) {
	var req struct {
		StopTime int64 `json:"stopTime"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := h.ProcessStop(req.StopTime)
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

func (h *Handler) ProcessStop(stopTime int64) (*models.Session, error) {
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

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updatedSession models.Session
	err := h.db.Collection("sessions").FindOneAndUpdate(dbCtx, filter, update, opts).Decode(&updatedSession)
	if err != nil {
		return nil, err
	}

	// Log event
	event := models.Event{
		Type: "STOP",
		Team: updatedSession.Team,
		Time: stopTime,
	}

	insertCtx, insertCancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer insertCancel()
	_, _ = h.db.Collection("events").InsertOne(insertCtx, event)

	h.hub.Broadcast(gin.H{
		"event":   "STOP",
		"endTime": stopTime,
		"team":    updatedSession.Team,
	})

	return &updatedSession, nil
}

func (h *Handler) GetState(c *gin.Context) {
	var session models.Session
	// Get the latest session (running or just finished)
	opts := options.FindOne().SetSort(bson.M{"_id": -1})

	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout)
	defer cancel()
	err := h.db.Collection("sessions").FindOne(dbCtx, bson.M{}, opts).Decode(&session)

	serverTime := time.Now().UnixMilli()

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
