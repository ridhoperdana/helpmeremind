# syntax=docker/dockerfile:1

# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main .

# Final stage
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["/app/main"] 