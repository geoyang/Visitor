#!/bin/bash
# Check deployment status and health of all services
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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🔍 Checking Backend Deployment Status"
echo "======================================"

# Check Docker
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running"
    exit 1
fi
print_status "Docker is running"

# Check if containers exist
CONTAINERS=$(docker-compose -f docker-compose.dev.yml ps --services 2>/dev/null || echo "")

if [ -z "$CONTAINERS" ]; then
    print_warning "No containers found. Backend may not be deployed."
    echo ""
    print_info "To deploy: ./scripts/auto-deploy.sh"
    exit 0
fi

# Check container status
echo ""
print_info "📋 Container Status:"
HEALTHY_COUNT=0
TOTAL_COUNT=0

for service in mongodb redis backend; do
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    
    if docker-compose -f docker-compose.dev.yml ps --quiet "$service" > /dev/null 2>&1; then
        STATUS=$(docker-compose -f docker-compose.dev.yml ps --format "table {{.State}}" "$service" 2>/dev/null | tail -n +2 | tr -d ' ')
        
        case "$STATUS" in
            "Up"|"running")
                print_status "$service: Running"
                HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
                ;;
            "Exited")
                print_error "$service: Exited"
                ;;
            *)
                print_warning "$service: $STATUS"
                ;;
        esac
    else
        print_error "$service: Not found"
    fi
done

# Check API endpoints
echo ""
print_info "🌐 API Health Checks:"

check_endpoint() {
    local endpoint="$1"
    local description="$2"
    local timeout="${3:-5}"
    
    if curl -f -s --max-time "$timeout" "http://localhost:8000/$endpoint" > /dev/null 2>&1; then
        print_status "$description: ✓"
        return 0
    else
        print_error "$description: ✗"
        return 1
    fi
}

API_HEALTHY=0
API_TOTAL=0

# Core health check
API_TOTAL=$((API_TOTAL + 1))
if check_endpoint "health" "Health Check"; then
    API_HEALTHY=$((API_HEALTHY + 1))
fi

# Essential endpoints
ENDPOINTS=(
    "analytics/summary:Analytics Summary"
    "companies:Companies API"
    "locations:Locations API"
    "devices:Devices API"
    "users:Users API"
)

for endpoint_desc in "${ENDPOINTS[@]}"; do
    endpoint="${endpoint_desc%%:*}"
    description="${endpoint_desc##*:}"
    API_TOTAL=$((API_TOTAL + 1))
    
    if check_endpoint "$endpoint" "$description"; then
        API_HEALTHY=$((API_HEALTHY + 1))
    fi
done

# Database connectivity
echo ""
print_info "🗄️ Database Connectivity:"

# Check MongoDB
if docker exec visitor_mongodb_dev mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    print_status "MongoDB: Connected"
else
    print_error "MongoDB: Connection failed"
fi

# Check Redis
if docker exec visitor_redis_dev redis-cli ping > /dev/null 2>&1; then
    print_status "Redis: Connected"
else
    print_error "Redis: Connection failed"
fi

# Resource usage
echo ""
print_info "📊 Resource Usage:"

docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker-compose -f docker-compose.dev.yml ps --quiet) 2>/dev/null || print_warning "Could not retrieve resource stats"

# Port status
echo ""
print_info "🔌 Port Status:"

PORTS=(8000 27017 6379)
for port in "${PORTS[@]}"; do
    if lsof -i :$port > /dev/null 2>&1; then
        SERVICE_NAME=""
        case $port in
            8000) SERVICE_NAME="Backend API" ;;
            27017) SERVICE_NAME="MongoDB" ;;
            6379) SERVICE_NAME="Redis" ;;
        esac
        print_status "Port $port ($SERVICE_NAME): Open"
    else
        print_error "Port $port: Not accessible"
    fi
done

# Summary
echo ""
echo "📈 Deployment Summary"
echo "===================="

if [ "$HEALTHY_COUNT" -eq "$TOTAL_COUNT" ] && [ "$API_HEALTHY" -ge 3 ]; then
    print_status "🎉 Backend is fully operational!"
    echo "   📊 Services: $HEALTHY_COUNT/$TOTAL_COUNT healthy"
    echo "   🌐 APIs: $API_HEALTHY/$API_TOTAL responding"
    echo ""
    print_info "🔗 Quick Links:"
    echo "   📍 API Base: http://localhost:8000"
    echo "   📚 API Docs: http://localhost:8000/docs"
    echo "   🔄 Redoc: http://localhost:8000/redoc"
    
elif [ "$HEALTHY_COUNT" -gt 0 ]; then
    print_warning "⚠️ Backend is partially operational"
    echo "   📊 Services: $HEALTHY_COUNT/$TOTAL_COUNT healthy"
    echo "   🌐 APIs: $API_HEALTHY/$API_TOTAL responding"
    echo ""
    print_info "🔧 Troubleshooting:"
    echo "   📋 Check logs: docker-compose -f docker-compose.dev.yml logs"
    echo "   🔄 Restart: ./scripts/auto-deploy.sh"
    
else
    print_error "❌ Backend is not operational"
    echo "   📊 Services: $HEALTHY_COUNT/$TOTAL_COUNT healthy"
    echo "   🌐 APIs: $API_HEALTHY/$API_TOTAL responding"
    echo ""
    print_info "🚨 Recovery:"
    echo "   🔄 Deploy: ./scripts/auto-deploy.sh"
    echo "   📋 Debug logs: docker-compose -f docker-compose.dev.yml logs"
fi

echo ""
print_info "⏰ Status checked at: $(date)"