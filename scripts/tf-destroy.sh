#!/bin/bash

echo "Stopping all services..."

# Kill the web application
pkill -f "node.*server.js" || true

# Kill the video server
pkill -f "node.*video-server.js" || true

echo "All services stopped!"
