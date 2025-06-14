#!/bin/bash
# Comprehensive deployment manager for visitor management backend
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_header() { echo -e "${CYAN}🚀 $1${NC}"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

show_help() {
    echo ""
    print_header "Backend Deployment Manager"
    echo "=========================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy, start    - Deploy/start the backend services"
    echo "  stop            - Stop all backend services"
    echo "  restart         - Restart all backend services"
    echo "  status          - Check deployment status"
    echo "  logs            - Show service logs"
    echo "  clean           - Clean up containers and images"
    echo "  watch           - Start file watcher for auto-deployment"
    echo "  update          - Update and redeploy with latest changes"
    echo "  backup          - Backup database"
    echo "  restore         - Restore database from backup"
    echo "  shell           - Open shell in backend container"
    echo "  help            - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy       # Deploy the backend"
    echo "  $0 status       # Check if everything is running"
    echo "  $0 logs backend # Show backend service logs"
    echo "  $0 watch        # Start auto-deployment on file changes"
    echo ""
}

cmd_deploy() {
    print_header "Deploying Backend Services"
    "$SCRIPT_DIR/auto-deploy.sh"
}

cmd_stop() {
    print_header "Stopping Backend Services"
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.dev.yml down
    print_status "All services stopped"
}

cmd_restart() {
    print_header "Restarting Backend Services"
    cmd_stop
    sleep 2
    cmd_deploy
}

cmd_status() {
    "$SCRIPT_DIR/deploy-status.sh"
}

cmd_logs() {
    cd "$PROJECT_DIR"
    if [ -n "$2" ]; then
        print_info "Showing logs for: $2"
        docker-compose -f docker-compose.dev.yml logs -f "$2"
    else
        print_info "Showing logs for all services (press Ctrl+C to exit)"
        docker-compose -f docker-compose.dev.yml logs -f
    fi
}

cmd_clean() {
    print_header "Cleaning Up Docker Resources"
    cd "$PROJECT_DIR"
    
    print_info "Stopping containers..."
    docker-compose -f docker-compose.dev.yml down --remove-orphans || true
    
    print_info "Removing unused containers..."
    docker container prune -f || true
    
    print_info "Removing unused images..."
    docker image prune -f || true
    
    print_info "Removing unused volumes..."
    docker volume prune -f || true
    
    print_status "Cleanup completed"
}

cmd_watch() {
    if [ ! -f "$SCRIPT_DIR/watch-and-deploy.sh" ]; then
        print_error "File watcher script not found!"
        exit 1
    fi
    
    print_header "Starting File Watcher for Auto-Deployment"
    "$SCRIPT_DIR/watch-and-deploy.sh"
}

cmd_update() {
    print_header "Updating and Redeploying"
    
    cd "$PROJECT_DIR"
    
    # Git pull if in git repo
    if [ -d .git ]; then
        print_info "Pulling latest changes from git..."
        git pull || print_warning "Git pull failed or no changes"
    fi
    
    # Update dependencies
    if [ -f requirements.txt ]; then
        print_info "Checking for dependency updates..."
        # This will be rebuilt in the container
    fi
    
    # Redeploy
    cmd_restart
}

cmd_backup() {
    print_header "Creating Database Backup"
    cd "$PROJECT_DIR"
    
    BACKUP_DIR="backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/mongodb_backup_$TIMESTAMP.gz"
    
    print_info "Creating backup: $BACKUP_FILE"
    
    if docker-compose -f docker-compose.dev.yml ps mongodb | grep -q "Up"; then
        docker exec visitor_mongodb_dev mongodump --db visitor_management_dev --gzip --archive > "$BACKUP_FILE"
        print_status "Backup created: $BACKUP_FILE"
    else
        print_error "MongoDB container is not running"
        exit 1
    fi
}

cmd_restore() {
    if [ -z "$2" ]; then
        print_error "Please specify backup file to restore"
        echo "Usage: $0 restore <backup_file>"
        echo "Available backups:"
        ls -la "$PROJECT_DIR/backups/"*.gz 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    BACKUP_FILE="$2"
    if [ ! -f "$BACKUP_FILE" ]; then
        BACKUP_FILE="$PROJECT_DIR/backups/$2"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    
    print_header "Restoring Database from Backup"
    print_warning "This will overwrite the current database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Restoring from: $BACKUP_FILE"
        docker exec -i visitor_mongodb_dev mongorestore --db visitor_management_dev --gzip --archive < "$BACKUP_FILE"
        print_status "Database restored successfully"
    else
        print_info "Restore cancelled"
    fi
}

cmd_shell() {
    cd "$PROJECT_DIR"
    
    if docker-compose -f docker-compose.dev.yml ps backend | grep -q "Up"; then
        print_info "Opening shell in backend container..."
        docker exec -it visitor_backend_dev /bin/bash
    else
        print_error "Backend container is not running"
        exit 1
    fi
}

# Main command handling
case "$1" in
    "deploy"|"start")
        cmd_deploy
        ;;
    "stop")
        cmd_stop
        ;;
    "restart")
        cmd_restart
        ;;
    "status")
        cmd_status
        ;;
    "logs")
        cmd_logs "$@"
        ;;
    "clean")
        cmd_clean
        ;;
    "watch")
        cmd_watch
        ;;
    "update")
        cmd_update
        ;;
    "backup")
        cmd_backup
        ;;
    "restore")
        cmd_restore "$@"
        ;;
    "shell")
        cmd_shell
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac