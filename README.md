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
# Optional protection (disabled by default)
# ENABLE_ADMIN_AUTH=true
# ADMIN_KEY=change-me
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

If you enable admin protection, set `VITE_ADMIN_KEY` in `web/.env` to match backend `ADMIN_KEY`:
```env
VITE_ADMIN_KEY=change-me
```

3. Open screens:
- `http://localhost:5173/admin`
- `http://localhost:5173/judge`
- `http://localhost:5173/public`

Vite proxies `/start`, `/stop`, `/state`, and `/ws` to backend `:8080`.

## Local Single-Command Run (Go serves built React)
```bash
make run
```
Then open:
- `http://localhost:8080/admin`
- `http://localhost:8080/judge`
- `http://localhost:8080/public`

## Docker
```bash
make docker-up
```

## Features
- **Robust STOP:** Dual-channel (WS + HTTP) with client-side retries.
- **Time Sync:** Server-offset calculation for millisecond accuracy.
- **Sync Views:** Admin, Judge, and Public views stay in sync.
