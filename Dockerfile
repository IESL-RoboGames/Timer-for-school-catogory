# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Build the Go Backend
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server ./cmd/server/main.go

# Stage 3: Final Production Image
FROM alpine:latest
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy built artifacts from previous stages
COPY --from=backend-builder /app/server .
COPY --from=frontend-builder /app/web/dist ./web/dist

# Expose port
EXPOSE 8080

# Run the server
CMD ["./server"]
