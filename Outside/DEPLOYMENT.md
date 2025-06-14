# 🚀 Automatic Backend Deployment System

This document explains how to use the automatic deployment system for the Visitor Management Backend APIs.

## 📋 Quick Start

### 1. Initial Setup
```bash
# Navigate to backend directory
cd /Users/geoyang/Development/Visitor/Outside

# Run setup (one-time)
./setup-deployment.sh

# Deploy backend immediately
./scripts/deploy-manager.sh deploy
```

### 2. Check Status
```bash
# Check if everything is running
./scripts/deploy-manager.sh status

# View logs
./scripts/deploy-manager.sh logs
```

### 3. Auto-Deploy on Changes
```bash
# Start file watcher for automatic deployment
./scripts/deploy-manager.sh watch
```

## 🛠️ Available Commands

### Main Deployment Manager
```bash
./scripts/deploy-manager.sh [COMMAND]
```

**Commands:**
- `deploy`, `start` - Deploy/start backend services
- `stop` - Stop all backend services  
- `restart` - Restart all backend services
- `status` - Check deployment status
- `logs [service]` - Show service logs
- `clean` - Clean up containers and images
- `watch` - Start file watcher for auto-deployment
- `update` - Update and redeploy with latest changes
- `backup` - Backup database
- `restore <file>` - Restore database from backup
- `shell` - Open shell in backend container
- `help` - Show all commands

### Direct Scripts
```bash
# Auto-deploy script (one-time deployment)
./scripts/auto-deploy.sh

# File watcher (continuous auto-deployment)
./scripts/watch-and-deploy.sh

# Status checker
./scripts/deploy-status.sh
```

## 🔧 Features

### ✅ **Automatic Deployment**
- **One-command deployment**: `./scripts/auto-deploy.sh`
- **Smart dependency handling**: Automatically installs requirements
- **Health checking**: Verifies all services are running correctly
- **Error recovery**: Provides helpful error messages and recovery steps

### 👁️ **File Watching & Auto-Reload**
- **Real-time monitoring**: Watches for changes in Python files, requirements, Docker configs
- **Smart filtering**: Ignores cache files, logs, and temporary files
- **Cooldown protection**: Prevents multiple deployments from rapid file changes
- **Cross-platform**: Works on macOS (fswatch) and Linux (inotifywait)

### 🔍 **Health Monitoring**
- **Service status**: Checks Docker containers (MongoDB, Redis, Backend)
- **API testing**: Verifies all endpoints are responding
- **Database connectivity**: Tests MongoDB and Redis connections
- **Resource monitoring**: Shows CPU and memory usage
- **Port status**: Confirms all required ports are accessible

### 📊 **Management Tools**
- **Backup/Restore**: Database backup and restore functionality
- **Log viewing**: Easy access to service logs
- **Container shell**: Direct access to backend container
- **Cleanup tools**: Remove unused Docker resources

## 🏗️ Architecture

### Services
- **Backend API**: FastAPI application (Port 8000)
- **MongoDB**: Database (Port 27017)
- **Redis**: Cache/Sessions (Port 6379)

### Docker Configuration
- **Development**: `docker-compose.dev.yml`
- **Hot reload**: Source code mounted for live updates
- **Health checks**: Built-in container health monitoring
- **Networking**: Isolated Docker network for services

## 📁 File Structure

```
Outside/
├── scripts/
│   ├── auto-deploy.sh           # One-time deployment
│   ├── watch-and-deploy.sh      # File watcher
│   ├── deploy-status.sh         # Health checker
│   ├── deploy-manager.sh        # Main management script
│   └── ...
├── docker-compose.dev.yml       # Docker services config
├── Dockerfile.dev               # Backend container
├── requirements.txt             # Python dependencies
├── main.py                      # FastAPI application
├── setup-deployment.sh          # Initial setup
├── aliases.sh                   # Optional command aliases
└── DEPLOYMENT.md               # This file
```

## 🚦 Usage Examples

### Example 1: First-Time Setup
```bash
# 1. Setup deployment system
./setup-deployment.sh

# 2. Deploy backend
./scripts/deploy-manager.sh deploy

# 3. Verify everything is working
./scripts/deploy-manager.sh status

# 4. View API documentation
open http://localhost:8000/docs
```

### Example 2: Development Workflow
```bash
# Start auto-deployment watcher
./scripts/deploy-manager.sh watch

# Now edit any Python file - deployment happens automatically!
# The watcher will:
# 1. Detect file changes
# 2. Rebuild containers
# 3. Restart services
# 4. Verify deployment
```

### Example 3: Troubleshooting
```bash
# Check what's wrong
./scripts/deploy-manager.sh status

# View logs for specific service
./scripts/deploy-manager.sh logs backend

# Clean up and restart
./scripts/deploy-manager.sh clean
./scripts/deploy-manager.sh deploy
```

### Example 4: Database Management
```bash
# Create backup
./scripts/deploy-manager.sh backup

# List backups
ls -la backups/

# Restore from backup
./scripts/deploy-manager.sh restore mongodb_backup_20250613_145000.gz
```

## 🔗 Frontend Integration

Your React dashboard automatically connects to the backend at:
- **API Base URL**: `http://localhost:8000`
- **Configuration**: `src/services/api.ts`

The frontend will work seamlessly once the backend is deployed.

## 🎯 Monitoring & URLs

### Service URLs
- **📍 Backend API**: http://localhost:8000
- **📚 API Documentation**: http://localhost:8000/docs  
- **🔄 ReDoc**: http://localhost:8000/redoc
- **💓 Health Check**: http://localhost:8000/health

### Key Endpoints
- `/companies` - Company management
- `/locations` - Location management  
- `/devices` - Device management
- `/users` - User management
- `/visitors` - Visitor management
- `/analytics/*` - Analytics and reporting

## 🛡️ Security Notes

### Development Environment
- **Database**: `visitor_management_dev` with admin/devpassword
- **JWT Secret**: Development key (not for production)
- **CORS**: Allows all origins for development
- **Debug Mode**: Enabled with hot reload

### Production Deployment
- Update `docker-compose.prod.yml` with secure credentials
- Use environment-specific `.env` files
- Enable SSL/TLS with Nginx reverse proxy
- Implement proper authentication and authorization

## 🚨 Troubleshooting

### Common Issues

**1. Docker not running**
```bash
# Start Docker Desktop or Docker daemon
# Then retry deployment
./scripts/deploy-manager.sh deploy
```

**2. Port conflicts**
```bash
# Check what's using the ports
lsof -i :8000 -i :27017 -i :6379

# Stop conflicting services and redeploy
./scripts/deploy-manager.sh restart
```

**3. Services not starting**
```bash
# Check logs for errors
./scripts/deploy-manager.sh logs

# Clean up and restart
./scripts/deploy-manager.sh clean
./scripts/deploy-manager.sh deploy
```

**4. File watcher not working**
```bash
# Install file watcher (macOS)
brew install fswatch

# Install file watcher (Linux)
sudo apt-get install inotify-tools

# Restart watcher
./scripts/deploy-manager.sh watch
```

## 📞 Support

### Getting Help
```bash
# Show all available commands
./scripts/deploy-manager.sh help

# Check deployment status
./scripts/deploy-status.sh

# View service logs
./scripts/deploy-manager.sh logs
```

### Debug Information
- **Container status**: `docker ps`
- **Container logs**: `docker logs visitor_backend_dev`
- **Network info**: `docker network ls`
- **Volume info**: `docker volume ls`

---

🎉 **Your backend APIs are now automatically deployed and ready!**

The system will automatically handle deployments whenever you make changes to your backend code, ensuring your frontend dashboard always has access to the latest API endpoints.