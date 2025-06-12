#!/bin/bash
# Production deployment script
set -e

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# Check Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_status "Docker is running"

# Check .env file
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_info "Please edit .env file with your production settings!"
        print_info "Important: Change MONGO_ROOT_PASSWORD and JWT_SECRET_KEY!"
    else
        print_error ".env.example file not found."
        exit 1
    fi
fi

# Create directories
mkdir -p uploads logs nginx/ssl mongodb/init backups
print_status "Directories created"

# Deploy
docker-compose down || true
docker-compose pull
docker-compose up -d --build

print_info "Waiting for services..."
sleep 15

if curl -f -s http://localhost:8000/health > /dev/null; then
    print_status "API is responding"
else
    print_warning "API health check failed"
fi

docker-compose ps
print_status "Deployment completed!"
echo ""
print_info "🌐 Backend API: http://localhost:8000"
print_info "📚 API Docs: http://localhost:8000/docs"
