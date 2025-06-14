#!/bin/bash
# File watcher for automatic deployment on backend changes
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
AUTO_DEPLOY_SCRIPT="$SCRIPT_DIR/auto-deploy.sh"

cd "$PROJECT_DIR"

echo "👀 Starting file watcher for automatic backend deployment..."
print_info "Watching directory: $PROJECT_DIR"
print_info "Auto-deploy script: $AUTO_DEPLOY_SCRIPT"

# Check if fswatch is available (macOS)
if command -v fswatch &> /dev/null; then
    WATCHER="fswatch"
    print_status "Using fswatch for file monitoring"
elif command -v inotifywait &> /dev/null; then
    WATCHER="inotifywait"
    print_status "Using inotifywait for file monitoring"
else
    print_error "Neither fswatch nor inotifywait found."
    print_info "Install fswatch: brew install fswatch (macOS)"
    print_info "Install inotify-tools: apt-get install inotify-tools (Linux)"
    exit 1
fi

# Files and directories to watch
WATCH_PATTERNS=(
    "*.py"
    "requirements.txt"
    "Dockerfile*"
    "docker-compose*.yml"
    ".env"
)

# Files and directories to ignore
IGNORE_PATTERNS=(
    "__pycache__"
    "*.pyc"
    ".git"
    "logs/*"
    "uploads/*"
    "backups/*"
    "*.log"
)

# Cooldown to prevent multiple deployments
COOLDOWN=5
LAST_DEPLOY=0

deploy_if_needed() {
    local current_time=$(date +%s)
    local time_diff=$((current_time - LAST_DEPLOY))
    
    if [ $time_diff -ge $COOLDOWN ]; then
        echo ""
        print_info "🔄 File changes detected, triggering deployment..."
        echo "Changed file: $1"
        echo "Time: $(date)"
        echo ""
        
        if "$AUTO_DEPLOY_SCRIPT"; then
            LAST_DEPLOY=$current_time
            print_status "✨ Auto-deployment completed successfully!"
        else
            print_error "❌ Auto-deployment failed!"
        fi
        echo ""
        print_info "👀 Continuing to watch for changes..."
    else
        echo "⏱️  Skipping deployment (cooldown: ${COOLDOWN}s)"
    fi
}

# Initial deployment
print_info "🚀 Running initial deployment..."
if "$AUTO_DEPLOY_SCRIPT"; then
    LAST_DEPLOY=$(date +%s)
    print_status "Initial deployment completed!"
else
    print_error "Initial deployment failed!"
    exit 1
fi

echo ""
print_status "🎯 File watcher is now active!"
print_info "Watching for changes in:"
for pattern in "${WATCH_PATTERNS[@]}"; do
    echo "   📁 $pattern"
done
echo ""
print_warning "Press Ctrl+C to stop watching"
echo ""

# Start file watching based on available tool
if [ "$WATCHER" = "fswatch" ]; then
    # Build fswatch command with patterns
    FSWATCH_CMD="fswatch -r --exclude='\\.git/' --exclude='__pycache__' --exclude='\\.pyc$' --exclude='/logs/' --exclude='/uploads/' --exclude='/backups/' --exclude='\\.log$' ."
    
    $FSWATCH_CMD | while read file; do
        # Check if file matches our watch patterns
        for pattern in "${WATCH_PATTERNS[@]}"; do
            if [[ "$file" == *"$pattern"* ]] || [[ "$file" == *"${pattern//\*/}"* ]]; then
                deploy_if_needed "$file"
                break
            fi
        done
    done

elif [ "$WATCHER" = "inotifywait" ]; then
    # Build inotifywait command
    while inotifywait -r -e modify,create,delete,move \
        --exclude='(__pycache__|\.pyc$|\.git|/logs/|/uploads/|/backups/|\.log$)' \
        . 2>/dev/null; do
        
        deploy_if_needed "$(pwd)"
    done
fi