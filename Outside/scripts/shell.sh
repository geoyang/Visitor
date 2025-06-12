#!/bin/bash
# Container shell access

COMPOSE_FILE="docker-compose.yml"
if [ "$1" = "--dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    shift
fi

SERVICE=${1:-backend}

echo "🐚 Accessing $SERVICE shell..."

if ! docker-compose -f $COMPOSE_FILE ps $SERVICE | grep -q "Up"; then
    echo "Starting $SERVICE..."
    docker-compose -f $COMPOSE_FILE up -d $SERVICE
    sleep 5
fi

if [ "$SERVICE" = "mongodb" ]; then
    docker-compose -f $COMPOSE_FILE exec $SERVICE mongosh --username admin --authenticationDatabase admin
else
    docker-compose -f $COMPOSE_FILE exec $SERVICE bash
fi
