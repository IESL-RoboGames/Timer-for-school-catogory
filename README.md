# RoboGames Timer

A low-latency, fault-tolerant timer system built with Go, WebSockets, and MongoDB.

## Tech Stack
- **Backend:** Go (Gin, Gorilla WebSocket)
- **Database:** MongoDB
- **Frontend:** React + MUI + Tailwind
- **Infrastructure:** Docker & Docker Compose

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Go 1.24+ (for local development)

### Running with Docker
```bash
make docker-up
```

### Local Development
1. Start MongoDB.
2. Configure .env.
3. Run the server:
```bash
make run
```

## Features
- **Robust STOP:** Dual-channel (WS + HTTP) with client-side retries.
- **Time Sync:** Server-offset calculation for millisecond accuracy.
- **Sync Views:** Admin, Judge, and Public views stay perfectly in sync.
