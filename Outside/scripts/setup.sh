#!/bin/bash
# setup.sh - Initial project setup script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

echo "🚀 Visitor Management System Setup"
echo "=================================="
echo ""

# Create scripts directory and files
print_info "Creating scripts directory..."
mkdir -p scripts

# Create all the script files
print_info "Creating deployment script..."
cat > scripts/deploy.sh << 'EOF'
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
EOF

print_info "Creating development script..."
cat > scripts/dev.sh << 'EOF'
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
EOF

print_info "Creating backup script..."
cat > scripts/backup.sh << 'EOF'
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
EOF

print_info "Creating logs script..."
cat > scripts/logs.sh << 'EOF'
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
EOF

print_info "Creating shell access script..."
cat > scripts/shell.sh << 'EOF'
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
EOF

print_info "Creating cleanup script..."
cat > scripts/clean.sh << 'EOF'
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
EOF

# Make all scripts executable
chmod +x scripts/*.sh
print_status "All scripts created and made executable"

# Create other necessary directories
print_info "Creating project directories..."
mkdir -p uploads logs nginx/ssl mongodb/init backups

# Create .env.example if it doesn't exist
if [ ! -f .env.example ]; then
    print_info "Creating .env.example file..."
    cat > .env.example << 'EOF'
# Database Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure_password_change_me
MONGO_DATABASE=visitor_management

# API Configuration
DEBUG=False
ENVIRONMENT=production
API_HOST=0.0.0.0
API_PORT=8000

# Security - CHANGE THESE IN PRODUCTION!
JWT_SECRET_KEY=your-super-secure-jwt-secret-key-at-least-32-characters-long
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:19006,https://yourdomain.com

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourcompany.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads

# Logging
LOG_LEVEL=INFO
EOF
    print_status ".env.example created"
fi

# Create MongoDB initialization script
print_info "Creating MongoDB initialization script..."
cat > mongodb/init/01-init.js << 'EOF'
// MongoDB initialization script
db = db.getSiblingDB('visitor_management');

// Create collections with validation
db.createCollection('visitors', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["form_id", "data", "check_in_time", "status"],
            properties: {
                form_id: { bsonType: "string" },
                data: { bsonType: "object" },
                check_in_time: { bsonType: "date" },
                status: { enum: ["checked_in", "checked_out", "expired"] }
            }
        }
    }
});

db.createCollection('forms');
db.createCollection('workflows');

// Create indexes
db.visitors.createIndex({ "status": 1 });
db.visitors.createIndex({ "check_in_time": 1 });
db.visitors.createIndex({ "form_id": 1 });
db.visitors.createIndex({ "data.email": 1 });
db.visitors.createIndex({ "data.host_name": 1 });

db.forms.createIndex({ "is_active": 1 });
db.workflows.createIndex({ "is_active": 1 });

// Insert default form
db.forms.insertOne({
    name: "Default Visitor Form",
    description: "Standard visitor check-in form",
    fields: [
        { name: "full_name", type: "text", label: "Full Name", required: true },
        { name: "company", type: "text", label: "Company", required: false },
        { name: "email", type: "email", label: "Email", required: true },
        { name: "phone", type: "phone", label: "Phone", required: false },
        { name: "visit_purpose", type: "select", label: "Purpose of Visit", required: true,
          options: ["Meeting", "Interview", "Delivery", "Maintenance", "Other"] },
        { name: "host_name", type: "text", label: "Host Name", required: true },
        { name: "notes", type: "textarea", label: "Additional Notes", required: false }
    ],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
});

print("Database initialized successfully!");
EOF

# Create nginx configuration
print_info "Creating nginx configuration..."
mkdir -p nginx
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";

        location /health {
            proxy_pass http://backend/health;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location / {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Create .dockerignore
print_info "Creating .dockerignore..."
cat > .dockerignore << 'EOF'
__pycache__
*.pyc
*.pyo
.Python
.env
.env.*
!.env.example
.git
.vscode/
.idea/
*.swp
*.log
uploads/*
logs/*
backups/*
README.md
*.md
node_modules/
EOF

# Create .gitignore
print_info "Creating .gitignore..."
cat > .gitignore << 'EOF'
# Environment
.env
.env.local

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Logs
logs/
*.log

# Uploads
uploads/*
!uploads/.gitkeep

# Backups
backups/
*.tar.gz

# Database
*.sqlite
*.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
.dockerignore
EOF

# Create placeholder files
print_info "Creating placeholder files..."
touch uploads/.gitkeep
touch logs/.gitkeep

print_status "Project structure created successfully!"
echo ""
print_info "📁 Project Structure:"
echo "├── scripts/"
echo "│   ├── deploy.sh       # Production deployment"
echo "│   ├── dev.sh          # Development setup"
echo "│   ├── backup.sh       # Database backup"
echo "│   ├── logs.sh         # View logs"
echo "│   ├── shell.sh        # Container shell access"
echo "│   └── clean.sh        # Cleanup everything"
echo "├── mongodb/"
echo "│   └── init/           # Database initialization"
echo "├── nginx/              # Reverse proxy config"
echo "├── uploads/            # File uploads"
echo "├── logs/               # Application logs"
echo "├── backups/            # Database backups"
echo "├── .env.example        # Environment template"
echo "└── .gitignore          # Git ignore rules"
echo ""
print_status "Setup completed! Next steps:"
echo ""
print_info "🔧 For Development:"
print_info "  ./scripts/dev.sh"
echo ""
print_info "🚀 For Production:"
print_info "  1. Copy .env.example to .env"
print_info "  2. Edit .env with your settings"
print_info "  3. ./scripts/deploy.sh"
echo ""
print_info "📋 Other Commands:"
print_info "  ./scripts/logs.sh          # View logs"
print_info "  ./scripts/backup.sh        # Backup database"
print_info "  ./scripts/shell.sh         # Access container shell"
print_info "  ./scripts/clean.sh         # Clean everything"
echo ""
print_warning "🔐 IMPORTANT: Change default passwords in .env before production!"