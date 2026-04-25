.PHONY: run build test docker-up docker-down clean

run:
	go run cmd/server/main.go

build:
	go build -o bin/main cmd/server/main.go

test:
	go test ./...

docker-up:
	docker-compose up --build

docker-down:
	docker-compose down

clean:
	rm -rf bin/
	docker system prune -f
