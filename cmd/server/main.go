package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"robogames-timer/internal/handlers"
	"robogames-timer/internal/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Prefer local .env values during development, even if shell vars exist.
	_ = godotenv.Overload()

	mongoURI := envOrDefault("MONGODB_URI", "mongodb://localhost:27017")
	dbName := envOrDefault("DB_NAME", "robogames")
	port := envOrDefault("PORT", "8080")
	enableAdminAuth := isTrue(os.Getenv("ENABLE_ADMIN_AUTH"))
	adminToken := envOrDefault("ADMIN_TOKEN", "dev-admin-token")
	adminPasswordHash := envOrDefault("ADMIN_PASSWORD_HASH", defaultAdminPasswordHash)

	// 1. Database Setup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI).SetServerSelectionTimeout(5*time.Second))
	if err != nil {
		log.Fatal(err)
	}

	pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer pingCancel()
	if err := client.Ping(pingCtx, nil); err != nil {
		log.Fatalf("mongodb ping failed (%s): %v", mongoURI, err)
	}

	db := client.Database(dbName)

	// 2. WebSocket Hub Setup
	hub := websocket.NewHub()
	go hub.Run()

	// 3. Handlers Setup
	h := handlers.NewHandler(db, hub, adminToken, adminPasswordHash, enableAdminAuth)
	if err := h.RecoverStateFromEvents(); err != nil {
		log.Printf("state recovery warning: %v", err)
	}

	hub.OnStop = func(signal websocket.StopSignal) {
		if enableAdminAuth && adminToken != "" && signal.AdminKey != adminToken {
			log.Printf("blocked websocket STOP from source=%s due to invalid admin key", signal.Source)
			return
		}
		_, _ = h.ProcessStop(signal.StopTime, signal.RequestID, signal.Source)
	}

	// 4. Router Setup
	r := gin.Default()
	r.Use(cors.Default())
	r.SetTrustedProxies(nil)

	// API Routes
	r.POST("/auth/login", h.AdminLogin)
	r.POST("/select", h.SelectTeam)
	r.POST("/start", h.StartTimer)
	r.POST("/stop", h.StopTimer)
	r.POST("/resume", h.ResumeTimer)
	r.POST("/reset", h.ResetTimer)
	r.POST("/finish", h.FinishTimer)
	r.POST("/hide-result", h.HideSession)
	r.POST("/charge/start", h.StartChargingTimer)
	r.POST("/charge/stop", h.StopChargingTimer)
	r.GET("/state", h.GetState)
	r.GET("/results", h.GetResults)
	r.GET("/ws", h.ServeWs)

	// Serve React build output for Admin/Judge/Public routes.
	if distExists("./web/dist") {
		r.Static("/assets", "./web/dist/assets")
		r.StaticFile("/favicon.svg", "./web/dist/favicon.svg")
		r.StaticFile("/icons.svg", "./web/dist/icons.svg")
		r.StaticFile("/RoboGames_logo.avif", "./web/dist/RoboGames_logo.avif")
		r.StaticFile("/cse.avif", "./web/dist/cse.avif")

		r.GET("/", func(c *gin.Context) {
			c.Redirect(http.StatusTemporaryRedirect, "/admin")
		})

		for _, route := range []string{"/admin", "/admin/", "/judge", "/judge/", "/public", "/public/"} {
			r.GET(route, serveWebIndex)
		}
	}

	// Start Server
	bindAddr := ":" + strings.TrimPrefix(port, ":")
	log.Printf("Server starting on %s...", bindAddr)
	if err := r.Run(bindAddr); err != nil {
		log.Fatal(err)
	}
}

// Default password is "admin123". Override in .env with ADMIN_PASSWORD_HASH.
const defaultAdminPasswordHash = "$2a$10$.f8H.xrtQ8GLzb7L55DIWu0kjhneGUeQ4YyMzGYK9jVrUgzjlXh1u"

func serveWebIndex(c *gin.Context) {
	c.File(filepath.Clean("./web/dist/index.html"))
}

func distExists(path string) bool {
	stat, err := os.Stat(path)
	if err != nil {
		return false
	}
	return stat.IsDir()
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func isTrue(value string) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}
