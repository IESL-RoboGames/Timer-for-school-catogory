package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // In production, refine this
	},
}

type Message struct {
	Type     string `json:"type"`
	StopTime int64  `json:"stopTime"`
}

type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan interface{}
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
	OnStop     func(stopTime int64)
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan interface{}),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			go h.readPump(client)
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				err := client.WriteJSON(message)
				if err != nil {
					log.Printf("websocket write error: %v", err)
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) readPump(conn *websocket.Conn) {
	defer func() {
		h.unregister <- conn
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("error: %v", err)
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("unmarshal error: %v", err)
			continue
		}

		if msg.Type == "STOP" && h.OnStop != nil {
			h.OnStop(msg.StopTime)
		}
	}
}

func (h *Hub) Broadcast(msg interface{}) {
	h.broadcast <- msg
}

func (h *Hub) ServeWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	h.register <- conn
}
