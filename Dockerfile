# Web build stage
FROM node:22-alpine AS web-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web .
RUN npm run build

# Go build stage
FROM golang:1.24-alpine AS go-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main ./cmd/server/main.go

# Run stage
FROM alpine:latest
WORKDIR /app
COPY --from=go-builder /app/main .
COPY --from=go-builder /app/.env .
COPY --from=web-builder /web/dist ./web/dist
EXPOSE 8080
CMD ["./main"]
