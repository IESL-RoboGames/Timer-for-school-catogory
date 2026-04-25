package main

import (
	"context"
	"log"
	"time"

	"robogames-timer/internal/handlers"
	"robogames-timer/internal/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// 1. Database Setup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database("robogames")

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
	log.Println("Server starting on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
