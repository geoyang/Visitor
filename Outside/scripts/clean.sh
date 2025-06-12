#!/bin/bash
# Cleanup script
set -e

echo "🧹 This will remove ALL containers, volumes, and data!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled"
    exit 0
fi

echo "Cleaning up..."
docker-compose down -v || true
docker-compose -f docker-compose.dev.yml down -v || true

# Remove images
docker images | grep visitor | awk '{print $3}' | xargs docker rmi -f || true

# Clean volumes
docker volume ls | grep visitor | awk '{print $2}' | xargs docker volume rm -f || true

echo "✅ Cleanup completed!"
