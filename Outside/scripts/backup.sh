#!/bin/bash
# Database backup script
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="visitor_mongodb"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🗄️ Starting database backup..."

if ! docker ps | grep -q $CONTAINER_NAME; then
    print_error "MongoDB container not running"
    exit 1
fi

if [ -f .env ]; then
    source .env
else
    print_error ".env file not found"
    exit 1
fi

mkdir -p $BACKUP_DIR

docker exec $CONTAINER_NAME mongodump \
    --username ${MONGO_ROOT_USERNAME:-admin} \
    --password ${MONGO_ROOT_PASSWORD} \
    --authenticationDatabase admin \
    --db ${MONGO_DATABASE:-visitor_management} \
    --out /tmp/backup \
    --quiet

docker cp $CONTAINER_NAME:/tmp/backup $BACKUP_DIR/mongodb_$DATE
docker exec $CONTAINER_NAME rm -rf /tmp/backup

cd $BACKUP_DIR
tar -czf mongodb_backup_$DATE.tar.gz mongodb_$DATE
rm -rf mongodb_$DATE

BACKUP_SIZE=$(du -h mongodb_backup_$DATE.tar.gz | cut -f1)
print_status "Backup completed: mongodb_backup_$DATE.tar.gz ($BACKUP_SIZE)"

# Keep last 7 backups
ls -t mongodb_backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f
