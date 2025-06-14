#!/bin/bash
# Setup script for easy backend deployment management
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_header() { echo -e "${CYAN}🔧 $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header "Setting up Backend Deployment Management"
echo "========================================"

# Make all scripts executable
print_info "Making scripts executable..."
chmod +x "$SCRIPT_DIR"/scripts/*.sh

# Check if fswatch is available (for file watching)
if command -v fswatch &> /dev/null; then
    print_status "fswatch is available for file watching"
elif command -v inotifywait &> /dev/null; then
    print_status "inotifywait is available for file watching"
else
    echo ""
    echo "📦 Optional: Install file watcher for automatic deployments"
    echo ""
    echo "macOS: brew install fswatch"
    echo "Linux: sudo apt-get install inotify-tools"
    echo ""
fi

# Create helpful aliases
ALIAS_FILE="$SCRIPT_DIR/aliases.sh"
cat > "$ALIAS_FILE" << 'EOF'
#!/bin/bash
# Helpful aliases for backend deployment management

BACKEND_DIR="$(dirname "${BASH_SOURCE[0]}")"

# Main deployment commands
alias deploy="$BACKEND_DIR/scripts/deploy-manager.sh deploy"
alias backend-start="$BACKEND_DIR/scripts/deploy-manager.sh deploy"
alias backend-stop="$BACKEND_DIR/scripts/deploy-manager.sh stop"
alias backend-restart="$BACKEND_DIR/scripts/deploy-manager.sh restart"
alias backend-status="$BACKEND_DIR/scripts/deploy-manager.sh status"
alias backend-logs="$BACKEND_DIR/scripts/deploy-manager.sh logs"
alias backend-watch="$BACKEND_DIR/scripts/deploy-manager.sh watch"

# Utility aliases
alias backend="$BACKEND_DIR/scripts/deploy-manager.sh"
alias deploy-auto="$BACKEND_DIR/scripts/auto-deploy.sh"
alias deploy-watch="$BACKEND_DIR/scripts/watch-and-deploy.sh"
alias deploy-status="$BACKEND_DIR/scripts/deploy-status.sh"

echo "🚀 Backend deployment aliases loaded!"
echo "Available commands:"
echo "  deploy, backend-start  - Deploy backend"
echo "  backend-stop          - Stop backend"
echo "  backend-restart       - Restart backend"
echo "  backend-status        - Check status"
echo "  backend-logs          - View logs"
echo "  backend-watch         - Auto-deploy on changes"
echo "  backend help          - Full command list"
EOF

chmod +x "$ALIAS_FILE"

print_status "Deployment scripts configured!"
echo ""
print_info "🎯 Quick Start Commands:"
echo ""
echo "1. Deploy backend:"
echo "   ./scripts/deploy-manager.sh deploy"
echo ""
echo "2. Check status:"
echo "   ./scripts/deploy-manager.sh status"
echo ""
echo "3. Auto-deploy on changes:"
echo "   ./scripts/deploy-manager.sh watch"
echo ""
echo "4. View all commands:"
echo "   ./scripts/deploy-manager.sh help"
echo ""

print_info "💡 Optional: Load aliases for easier commands:"
echo "   source aliases.sh"
echo "   # Then use: deploy, backend-status, backend-logs, etc."
echo ""

print_info "🔗 Your frontend dashboard will connect to: http://localhost:8000"
print_status "Setup completed! Ready for automatic deployment."