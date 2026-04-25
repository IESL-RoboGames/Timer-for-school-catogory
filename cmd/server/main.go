package main

import (
	"context"
	"log"
	"os"
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
	// 0. Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default environment variables")
	}

	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "robogames"
	}

	// 1. Database Setup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database(dbName)

	// 2. WebSocket Hub Setup
	hub := websocket.NewHub()
	go hub.Run()

	// 3. Handlers Setup
	h := handlers.NewHandler(db, hub)
	hub.OnStop = func(stopTime int64) {
		h.ProcessStop(stopTime)
	}

	// 4. Router Setup
	r := gin.Default()
	r.Use(cors.Default())

	// Static files (for Admin, Judge, Public screens)
	r.Static("/admin", "./static/admin")
	r.Static("/judge", "./static/judge")
	r.Static("/public", "./static/public")

	// API Routes
	r.POST("/start", h.StartTimer)
	r.POST("/stop", h.StopTimer)
	r.GET("/state", h.GetState)
	r.GET("/ws", h.ServeWs)

	// Start Server
	log.Printf("Server starting on :%s...\n", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
