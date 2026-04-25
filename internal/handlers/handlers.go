package handlers

import (
	"context"
	"math"
	"net/http"
	"strings"
	"time"

	"robogames-timer/internal/models"
	"robogames-timer/internal/websocket"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

const mongoOpTimeout = 5 * time.Second

type Handler struct {
	db           *mongo.Database
	hub          *websocket.Hub
	adminToken   string
	passwordHash string
	requireAuth  bool
}

func NewHandler(db *mongo.Database, hub *websocket.Hub, adminToken, passwordHash string, requireAuth bool) *Handler {
	return &Handler{
		db:           db,
		hub:          hub,
		adminToken:   strings.TrimSpace(adminToken),
		passwordHash: strings.TrimSpace(passwordHash),
		requireAuth:  requireAuth,
	}
}

func (h *Handler) authorizeAdmin(c *gin.Context) bool {
	if !h.requireAuth || h.adminToken == "" {
		return true
	}
	provided := strings.TrimSpace(c.GetHeader("X-Admin-Key"))
	if provided == "" {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		provided = strings.TrimPrefix(authHeader, "Bearer ")
	}
	if provided != h.adminToken {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return false
	}
	return true
}

func (h *Handler) AdminLogin(c *gin.Context) {
	var req struct { Password string `json:"password"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(h.passwordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid password"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": h.adminToken, "authRequired": true})
}

func (h *Handler) SelectTeam(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	var req struct {
		Team  string `json:"team"`
		Round int    `json:"round"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	h.hub.Broadcast(gin.H{
		"event": "SELECT",
		"team":  req.Team,
		"round": req.Round,
	})
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) StartTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	var req struct { 
		Team   string `json:"team"`
		Round  int    `json:"round"`
		Source string `json:"source"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	startTime := time.Now().UnixMilli()
	session := models.Session{ Team: req.Team, Round: req.Round, StartTime: startTime, Status: "running" }
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	res, err := h.db.Collection("sessions").InsertOne(dbCtx, session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save session"})
		return
	}
	h.hub.Broadcast(gin.H{"event": "START", "team": req.Team, "round": req.Round, "startTime": startTime, "sessionId": res.InsertedID})
	c.JSON(http.StatusOK, session)
}

func (h *Handler) StopTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	var req struct { StopTime float64 `json:"stopTime"` }
	c.ShouldBindJSON(&req)
	session, err := h.ProcessStop(int64(math.Round(req.StopTime)), "", "web")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *Handler) ProcessStop(stopTime int64, requestID, source string) (*models.Session, error) {
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	latest, _ := h.getLatestSession()
	if latest == nil || latest.Status != "running" { return latest, nil }

	update := bson.M{"$set": bson.M{"endTime": stopTime, "status": "paused"}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated models.Session
	err := h.db.Collection("sessions").FindOneAndUpdate(dbCtx, bson.M{"_id": latest.ID}, update, opts).Decode(&updated)
	if err != nil { return nil, err }
	
	if updated.ChargeStatus == "running" {
		_, _ = h.db.Collection("sessions").UpdateByID(dbCtx, updated.ID, bson.M{"$set": bson.M{"chargeEndTime": stopTime, "chargeStatus": "finished"}})
		updated.ChargeEndTime = stopTime; updated.ChargeStatus = "finished"
		h.hub.Broadcast(gin.H{"event": "CHARGE_STOP", "team": updated.Team, "chargeEndTime": stopTime})
	}
	h.hub.Broadcast(gin.H{"event": "STOP", "endTime": stopTime, "team": updated.Team})
	return &updated, nil
}

func (h *Handler) FinishTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	latest, _ := h.getLatestSession()
	if latest != nil {
		_, err := h.db.Collection("sessions").UpdateByID(dbCtx, latest.ID, bson.M{"$set": bson.M{"status": "finished"}})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to finish session"})
			return
		}
	}
	h.hub.Broadcast(gin.H{"event": "RESET"})
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) ResumeTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	latest, _ := h.getLatestSession()
	if latest == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "no session to resume"})
		return
	}
	elapsed := latest.EndTime - latest.StartTime
	newStart := time.Now().UnixMilli() - elapsed
	update := bson.M{"$set": bson.M{"startTime": newStart, "status": "running"}, "$unset": bson.M{"endTime": ""}}
	var updated models.Session
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	err := h.db.Collection("sessions").FindOneAndUpdate(dbCtx, bson.M{"_id": latest.ID}, update, opts).Decode(&updated)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resume"})
		return
	}
	h.hub.Broadcast(gin.H{"event": "START", "team": updated.Team, "round": updated.Round, "startTime": updated.StartTime})
	c.JSON(http.StatusOK, updated)
}

func (h *Handler) ResetTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	latest, _ := h.getLatestSession()
	if latest != nil { 
		_, _ = h.db.Collection("sessions").UpdateByID(dbCtx, latest.ID, bson.M{"$set": bson.M{"status": "cancelled"}}) 
	}
	h.hub.Broadcast(gin.H{"event": "RESET"})
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) GetState(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	session, _ := h.getLatestSession()
	if session != nil && (session.Status == "cancelled" || session.Status == "finished") { session = nil }
	c.JSON(http.StatusOK, gin.H{"serverTime": time.Now().UnixMilli(), "session": session, "authRequired": h.requireAuth})
}

func (h *Handler) GetResults(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	cursor, err := h.db.Collection("sessions").Find(dbCtx, bson.M{"status": "finished"}, options.Find().SetSort(bson.M{"_id": -1}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch results"})
		return
	}
	var res []models.Session
	if err := cursor.All(dbCtx, &res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decode results"})
		return
	}
	results := []gin.H{}
	for _, s := range res {
		charge := int64(0)
		if s.ChargeEndTime > s.ChargeStartTime && s.ChargeStartTime > 0 { charge = s.ChargeEndTime - s.ChargeStartTime }
		results = append(results, gin.H{"id": s.ID.Hex(), "team": s.Team, "round": s.Round, "elapsedMs": s.EndTime - s.StartTime, "chargeMs": charge})
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}

func (h *Handler) HideSession(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	var req struct { ID string `json:"id"` }
	if err := c.ShouldBindJSON(&req); err != nil { return }
	objID, err := primitive.ObjectIDFromHex(req.ID)
	if err != nil { return }
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	_, _ = h.db.Collection("sessions").UpdateByID(dbCtx, objID, bson.M{"$set": bson.M{"status": "hidden"}})
	h.hub.Broadcast(gin.H{"event": "RESULTS_UPDATED"})
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) StartChargingTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	now := time.Now().UnixMilli()
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	var updated models.Session
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After).SetSort(bson.M{"_id": -1})
	err := h.db.Collection("sessions").FindOneAndUpdate(dbCtx, bson.M{"status": "running"}, bson.M{"$set": bson.M{"chargeStartTime": now, "chargeStatus": "running"}}, opts).Decode(&updated)
	if err != nil { return }
	h.hub.Broadcast(gin.H{"event": "CHARGE_START", "team": updated.Team, "chargeStartTime": now})
	c.JSON(http.StatusOK, updated)
}

func (h *Handler) StopChargingTimer(c *gin.Context) {
	if !h.authorizeAdmin(c) { return }
	var req struct { ChargeStopTime float64 `json:"chargeStopTime"` }
	c.ShouldBindJSON(&req); stop := int64(math.Round(req.ChargeStopTime))
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	var updated models.Session
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After).SetSort(bson.M{"_id": -1})
	err := h.db.Collection("sessions").FindOneAndUpdate(dbCtx, bson.M{"status": "running", "chargeStatus": "running"}, bson.M{"$set": bson.M{"chargeEndTime": stop, "chargeStatus": "finished"}}, opts).Decode(&updated)
	if err != nil { return }
	h.hub.Broadcast(gin.H{"event": "CHARGE_STOP", "team": updated.Team, "chargeEndTime": stop})
	c.JSON(http.StatusOK, updated)
}

func (h *Handler) ServeWs(c *gin.Context) { h.hub.ServeWs(c.Writer, c.Request) }
func (h *Handler) getLatestSession() (*models.Session, error) {
	dbCtx, cancel := context.WithTimeout(context.Background(), mongoOpTimeout); defer cancel()
	var s models.Session
	err := h.db.Collection("sessions").FindOne(dbCtx, bson.M{}, options.FindOne().SetSort(bson.M{"_id": -1})).Decode(&s)
	if err != nil { return nil, err }
	return &s, nil
}
func (h *Handler) RecoverStateFromEvents() error { return nil }
