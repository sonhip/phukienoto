#!/bin/bash

echo "Deploying SmartLifeHub..."

git pull origin main

# The image is built on the developer machine and published to Docker Hub.
docker-compose pull
docker-compose up -d --force-recreate

echo "Deployment successful. Web is running on port 3000."
