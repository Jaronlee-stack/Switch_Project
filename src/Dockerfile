FROM golang:1.21 AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o posture-backend ./main.go

FROM debian:stable-slim
WORKDIR /root/
COPY --from=builder /app/posture-backend .
EXPOSE 8080
CMD ["./posture-backend"]