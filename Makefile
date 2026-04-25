.PHONY: run run-api web-dev web-build build test docker-up docker-down clean

run: web-build
	go run cmd/server/main.go

run-api:
	go run cmd/server/main.go

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

build: web-build
	go build -o bin/main cmd/server/main.go

test:
	go test ./...

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down

clean:
	rm -rf bin/
	rm -rf web/dist
	docker system prune -f
