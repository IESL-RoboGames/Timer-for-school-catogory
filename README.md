# RoboGames Timer

A low-latency, fault-tolerant timer system built with Go, WebSockets, MongoDB, and React (MUI).

## Tech Stack
- **Backend:** Go (Gin, Gorilla WebSocket)
- **Database:** MongoDB
- **Frontend:** React + MUI + Tailwind (in `web/`)
- **Infrastructure:** Docker & Docker Compose

## Prerequisites
- Go 1.24+
- Node.js 20+
- MongoDB (local or Atlas)

## Environment
Create `.env` in project root:

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=robogames
PORT=8080
# Optional admin login (disabled by default)
# ENABLE_ADMIN_AUTH=true
# ADMIN_TOKEN=dev-admin-token
# ADMIN_PASSWORD_HASH=$2a$10$.f8H.xrtQ8GLzb7L55DIWu0kjhneGUeQ4YyMzGYK9jVrUgzjlXh1u
```

## Local Development (No Docker)
Use two terminals.

1. Start backend API (Go):
```bash
make run-api
```

2. Start React frontend dev server (Vite):
```bash
make web-dev
```

If admin login is enabled, open `/admin`, enter the admin password, and the app stores the returned token locally.
Default password for the default hash is `admin123` (change this in production).

3. Open screens:
- `http://localhost:5173/admin`
- `http://localhost:5173/judge`
- `http://localhost:5173/public`

LAN access from other devices on same network:
- `http://<YOUR_MACHINE_IP>:5173/admin`
- `http://<YOUR_MACHINE_IP>:5173/judge`
- `http://<YOUR_MACHINE_IP>:5173/public`

Vite proxies `/start`, `/stop`, `/state`, and `/ws` to backend `:8080`.

## Local Single-Command Run (Go serves built React)
```bash
make run
```
Then open:
- `http://localhost:8080/admin`
- `http://localhost:8080/judge`
- `http://localhost:8080/public`

LAN access (single-command mode):
- `http://<YOUR_MACHINE_IP>:8080/admin`
- `http://<YOUR_MACHINE_IP>:8080/judge`
- `http://<YOUR_MACHINE_IP>:8080/public`

## Docker
```bash
make docker-up
```

## Features
- **Robust STOP:** Dual-channel (WS + HTTP) with client-side retries.
- **Time Sync:** Server-offset calculation for millisecond accuracy.
- **Sync Views:** Admin, Judge, and Public views stay in sync.
