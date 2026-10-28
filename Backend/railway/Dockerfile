# =============================================================================
# InAds Backend (Golang) — Multi-stage Dockerfile para Railway
# =============================================================================

# Etapa 1: Compilación
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Certificados y zona horaria
RUN apk add --no-cache ca-certificates tzdata

COPY go.mod ./
COPY . .

# Compilar binario estático optimizado sin símbolos de depuración
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o /app/bin/inads-api ./cmd/api

# Etapa 2: Imagen mínima y segura de producción
FROM alpine:3.20

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S inads && adduser -S inads -G inads

COPY --from=builder /app/bin/inads-api /app/inads-api

USER inads

EXPOSE 8080

ENTRYPOINT ["/app/inads-api"]

