#!/bin/bash
# Log viewing script

COMPOSE_FILE="docker-compose.yml"
if [ "$1" = "--dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    shift
fi

SERVICE=$1

if [ -z "$SERVICE" ]; then
    echo "Available services:"
    docker-compose -f $COMPOSE_FILE ps --services 2>/dev/null || echo "No services running"
    echo ""
    echo "Usage: $0 [--dev] [service_name]"
    echo "Showing all logs..."
    docker-compose -f $COMPOSE_FILE logs -f --tail=100
else
    echo "Showing logs for: $SERVICE"
    docker-compose -f $COMPOSE_FILE logs -f --tail=100 $SERVICE
fi
