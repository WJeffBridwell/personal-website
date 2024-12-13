#!/bin/bash

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f "node.*server.js" || true
pkill -f "node.*video-server.js" || true

# Wait a moment for processes to clean up
sleep 2

# Start the web application
echo "Starting web application..."
node server.js > server.log 2>&1 &

# Start the video server
echo "Starting video server..."
node video-server.js > video-server.log 2>&1 &

echo "Services started! Ports:"
echo "- Web app: http://localhost:3001"
echo "- Video server: http://localhost:8082"
echo "Logs:"
echo "- Web app: server.log"
echo "- Video server: video-server.log"
