terraform {
  required_providers {
    local = {
      source = "hashicorp/local"
      version = "~> 2.4.0"
    }
    null = {
      source = "hashicorp/null"
      version = "~> 3.2.0"
    }
  }
  required_version = ">= 1.0.0"
}

# Install Node.js and npm using homebrew
resource "null_resource" "install_node" {
  provisioner "local-exec" {
    command = <<-EOT
      if ! command -v node &> /dev/null; then
        brew install node@20
      fi
    EOT
  }
}

# Install project dependencies and nodemon
resource "null_resource" "install_dependencies" {
  depends_on = [null_resource.install_node]
  
  provisioner "local-exec" {
    command = <<-EOT
      cd /Users/jeffbridwell/CascadeProjects/personal-website
      npm install
      # Install nodemon locally instead of globally
      npm install nodemon --save-dev
      # Install Hexo and its dependencies
      npm install hexo hexo-server hexo-renderer-ejs hexo-renderer-marked hexo-renderer-stylus --save
    EOT
  }
}

# Update package.json scripts
resource "null_resource" "update_package_json" {
  depends_on = [null_resource.install_dependencies]
  
  provisioner "local-exec" {
    command = <<-EOT
      cd /Users/jeffbridwell/CascadeProjects/personal-website
      # Add dev script if it doesn't exist
      if ! grep -q '"dev":' package.json; then
        sed -i '' 's/"scripts": {/"scripts": {\n    "dev": "nodemon server.js",/' package.json
      fi
    EOT
  }
}

# Create nodemon configuration
resource "local_file" "nodemon_config" {
  filename = "/Users/jeffbridwell/CascadeProjects/personal-website/nodemon.json"
  content  = <<-EOT
{
  "watch": ["*.js", "public/**/*"],
  "ext": "js,json,html,css",
  "ignore": ["node_modules/**/*"],
  "env": {
    "NODE_ENV": "development"
  }
}
  EOT
}

# Create development environment configuration
resource "local_file" "dev_env_config" {
  filename = "/Users/jeffbridwell/CascadeProjects/personal-website/.env.development"
  content  = <<-EOT
    NODE_ENV=development
    PORT=3001
  EOT
}

# Start servers
resource "null_resource" "start_servers" {
  depends_on = [
    null_resource.update_package_json,
    local_file.dev_env_config,
    local_file.nodemon_config
  ]

  # Start both servers
  provisioner "local-exec" {
    command = <<-EOT
      cd /Users/jeffbridwell/CascadeProjects/personal-website
      
      # Create logs directory if it doesn't exist
      mkdir -p logs
      
      # Kill existing processes more thoroughly
      pkill -f "npm run dev" || true
      pkill -f "node server.js" || true
      pkill -f "node video-server.js" || true
      
      # Wait for ports to be released
      sleep 2
      
      # Check if ports are still in use
      if lsof -i:3001 >/dev/null 2>&1; then
        echo "Error: Port 3001 is still in use"
        exit 1
      fi
      
      if lsof -i:8082 >/dev/null 2>&1; then
        echo "Error: Port 8082 is still in use"
        exit 1
      fi
      
      # Start video server first
      echo "Starting video server..."
      node video-server.js > logs/video-server.log 2>&1 &
      video_pid=$!
      echo "$video_pid" > logs/video-server.pid
      
      # Wait for video server to be ready
      max_attempts=15
      attempt=1
      while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8082/health > /dev/null; then
          echo "Video server is running"
          break
        fi
        
        if ! ps -p $video_pid > /dev/null; then
          echo "Error: Video server process died"
          cat logs/video-server.log
          exit 1
        fi
        
        echo "Waiting for video server... attempt $attempt/$max_attempts"
        sleep 1
        attempt=$((attempt + 1))
      done
      
      if [ $attempt -gt $max_attempts ]; then
        echo "Error: Video server failed to start"
        cat logs/video-server.log
        exit 1
      fi
      
      # Start main server
      echo "Starting main server..."
      npm run dev > logs/main-server.log 2>&1 &
      main_pid=$!
      echo "$main_pid" > logs/main-server.pid
      
      # Wait for main server to be ready
      attempt=1
      while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3001/health > /dev/null; then
          echo "Main server is running"
          break
        fi
        
        if ! ps -p $main_pid > /dev/null; then
          echo "Error: Main server process died"
          cat logs/main-server.log
          exit 1
        fi
        
        echo "Waiting for main server... attempt $attempt/$max_attempts"
        sleep 1
        attempt=$((attempt + 1))
      done
      
      if [ $attempt -gt $max_attempts ]; then
        echo "Error: Main server failed to start"
        cat logs/main-server.log
        exit 1
      fi
      
      echo "Both servers started successfully"
    EOT
  }

  # Cleanup on destroy
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      cd /Users/jeffbridwell/CascadeProjects/personal-website
      
      # Kill servers using saved PIDs if they exist
      if [ -f logs/main-server.pid ]; then
        pid=$(cat logs/main-server.pid)
        kill $pid 2>/dev/null || true
        rm logs/main-server.pid
      fi
      
      if [ -f logs/video-server.pid ]; then
        pid=$(cat logs/video-server.pid)
        kill $pid 2>/dev/null || true
        rm logs/video-server.pid
      fi
      
      # Fallback to pkill
      pkill -f "npm run dev" || true
      pkill -f "node server.js" || true
      pkill -f "node video-server.js" || true
      
      # Remove log files
      rm -f logs/main-server.log logs/video-server.log
    EOT
  }
}
