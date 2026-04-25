package handlers

import (
	"context"
	"net/http"
	"time"

	"robogames-timer/internal/models"
	"robogames-timer/internal/websocket"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

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

	res, err := h.db.Collection("sessions").InsertOne(context.TODO(), session)
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
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
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

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updatedSession models.Session
	err := h.db.Collection("sessions").FindOneAndUpdate(context.TODO(), filter, update, opts).Decode(&updatedSession)
	if err != nil {
		return nil, err
	}

	// Log event
	event := models.Event{
		Type: "STOP",
		Team: updatedSession.Team,
		Time: stopTime,
	}
	h.db.Collection("events").InsertOne(context.TODO(), event)

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
	err := h.db.Collection("sessions").FindOne(context.TODO(), bson.M{}, opts).Decode(&session)
	
	serverTime := time.Now().UnixMilli()

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
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
