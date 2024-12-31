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
      
      # Kill existing processes
      pkill -f "npm run dev" || true
      pkill -f "node server.js" || true
      
      # Start main server
      npm run dev > logs/main-server.log 2>&1 &
      main_pid=$!
      
      # Start video server
      node video-server.js > logs/video-server.log 2>&1 &
      video_pid=$!
      
      # Save PIDs to file for cleanup
      echo "$main_pid" > logs/main-server.pid
      echo "$video_pid" > logs/video-server.pid
      
      # Wait for servers to be ready
      echo "Waiting for servers to start..."
      max_attempts=30
      attempt=1
      
      while [ $attempt -le $max_attempts ]; do
        main_running=false
        video_running=false
        
        # Check main server
        if curl -s http://localhost:3001/health > /dev/null; then
          main_running=true
          echo "Main server is running"
        fi
        
        # Check video server
        if curl -s http://localhost:8082/health > /dev/null; then
          video_running=true
          echo "Video server is running"
        fi
        
        # Check if both servers are running
        if [ "$main_running" = true ] && [ "$video_running" = true ]; then
          echo "Both servers are running successfully"
          exit 0
        fi
        
        # Check if processes are still alive
        if ! ps -p $main_pid > /dev/null; then
          echo "Error: Main server process died"
          cat logs/main-server.log
          exit 1
        fi
        
        if ! ps -p $video_pid > /dev/null; then
          echo "Error: Video server process died"
          cat logs/video-server.log
          exit 1
        fi
        
        echo "Attempt $attempt/$max_attempts: Waiting for servers..."
        sleep 1
        attempt=$((attempt + 1))
      done
      
      echo "Error: Servers failed to start within timeout"
      echo "Main server log:"
      cat logs/main-server.log
      echo "Video server log:"
      cat logs/video-server.log
      exit 1
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
      
      # Fallback to pkill if PIDs don't exist or processes are still running
      pkill -f "npm run dev" || true
      pkill -f "node server.js" || true
      pkill -f "node video-server.js" || true
    EOT
  }
}
