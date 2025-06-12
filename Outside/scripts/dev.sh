#!/bin/bash
# Development setup script
set -e

echo "🔧 Setting up development environment..."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "\033[0;31m❌ Docker is not running. Please start Docker and try again.\033[0m"
    exit 1
fi
print_status "Docker is running"

# Create dev .env
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

# Create directories
mkdir -p uploads logs mongodb/init backups
print_status "Directories created"

# Start services
docker-compose -f docker-compose.dev.yml down || true
docker-compose -f docker-compose.dev.yml up -d --build

print_info "Waiting for services..."
sleep 15

if curl -f -s http://localhost:8000/health > /dev/null; then
    print_status "API is responding"
fi

docker-compose -f docker-compose.dev.yml ps
print_status "Development environment ready!"
echo ""
print_info "🌐 Backend API: http://localhost:8000"
print_info "📚 API Docs: http://localhost:8000/docs"
