#!/bin/bash
# Automatic deployment script for visitor management backend
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🚀 Starting automatic backend deployment..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_status "Docker is running"

# Check for changes (optional git integration)
if command -v git &> /dev/null && [ -d .git ]; then
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Uncommitted changes detected"
        echo -e "${YELLOW}Changes:${NC}"
        git status --short
        echo ""
    fi
fi

# Stop existing containers gracefully
print_info "Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down --remove-orphans || true

# Clean up old images (optional)
print_info "Cleaning up old Docker images..."
docker image prune -f || true

# Create necessary directories
mkdir -p uploads logs mongodb/init backups

# Ensure .env exists
if [ ! -f .env ]; then
    print_info "Creating development .env file..."
    cat > .env << 'ENVEOF'
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=devpassword
MONGO_DATABASE=visitor_management_dev
DEBUG=True
ENVIRONMENT=development
API_HOST=0.0.0.0
API_PORT=8000
JWT_SECRET_KEY=dev-secret-key-not-for-production
CORS_ORIGINS=*
LOG_LEVEL=DEBUG
ENVEOF
    print_status "Development .env created"
fi

# Build and start services
print_info "Building and starting services..."
docker-compose -f docker-compose.dev.yml up -d --build

# Wait for services to be ready
print_info "Waiting for services to be ready..."
MAX_WAIT=120
WAIT_TIME=0
INTERVAL=5

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
        print_status "Backend API is ready!"
        break
    fi
    
    echo -n "."
    sleep $INTERVAL
    WAIT_TIME=$((WAIT_TIME + INTERVAL))
done

echo ""

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
    print_error "Deployment timed out. Services may not be ready."
    print_info "Checking service status..."
    docker-compose -f docker-compose.dev.yml ps
    exit 1
fi

# Verify deployment
print_info "Verifying deployment..."

# Check all services
SERVICES=("mongodb" "redis" "backend")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker-compose -f docker-compose.dev.yml ps --services --filter "status=running" | grep -q "^${service}$"; then
        print_status "$service is running"
    else
        print_error "$service is not running"
        ALL_HEALTHY=false
    fi
done

# Test API endpoints
API_TESTS=(
    "health:Health check"
    "analytics/summary:Analytics"
    "companies:Companies (may be empty)"
)

print_info "Testing API endpoints..."
for test in "${API_TESTS[@]}"; do
    endpoint="${test%%:*}"
    description="${test##*:}"
    
    if curl -f -s "http://localhost:8000/$endpoint" > /dev/null; then
        print_status "$description endpoint working"
    else
        print_warning "$description endpoint not responding (may be normal if no data)"
    fi
done

# Show deployment summary
echo ""
echo "🎉 Deployment Summary"
echo "===================="
print_status "Backend deployed successfully!"
echo ""
print_info "📍 Service URLs:"
echo "   🌐 Backend API: http://localhost:8000"
echo "   📚 API Documentation: http://localhost:8000/docs"
echo "   📊 Interactive API: http://localhost:8000/redoc"
echo ""
print_info "🔧 Management Commands:"
echo "   View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.dev.yml down"
echo "   Restart: $0"
echo ""

# Show running containers
print_info "Running containers:"
docker-compose -f docker-compose.dev.yml ps

if [ "$ALL_HEALTHY" = true ]; then
    print_status "All services are healthy and ready!"
    echo ""
    print_info "🎯 Your dashboard frontend can now connect to the backend APIs"
    print_info "🔄 The backend will automatically reload when you make changes"
else
    print_warning "Some services may have issues. Check the logs for details."
    echo ""
    print_info "Debug commands:"
    echo "   docker-compose -f docker-compose.dev.yml logs backend"
    echo "   docker-compose -f docker-compose.dev.yml logs mongodb"
    echo "   docker-compose -f docker-compose.dev.yml logs redis"
fi

echo ""
print_status "Automatic deployment completed!"