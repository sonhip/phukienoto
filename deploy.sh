#!/bin/bash

echo "🚀 Deploying SmartLifeHub Phụ Kiện Ô Tô..."

# Update code
git pull origin main

# Build and start container
docker-compose down
docker-compose up -d --build

echo "✅ Deployment successful! Web running on port 3000."
