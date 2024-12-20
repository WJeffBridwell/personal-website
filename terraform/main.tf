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

# Install project dependencies
resource "null_resource" "install_dependencies" {
  depends_on = [null_resource.install_node]
  
  provisioner "local-exec" {
    command = "npm install"
    working_dir = "/Users/jeffbridwell/CascadeProjects/personal-website"
  }
}

# Remove any existing launch agents/daemons and stop processes
resource "null_resource" "cleanup_launch_agents" {
  provisioner "local-exec" {
    command = <<-EOT
      # Kill any existing npm/node processes for this project
      pkill -f "npm run dev" || true
      pkill -f "nodemon server.js" || true
      pkill -f "/usr/local/bin/node server.js" || true
      
      # Remove any Node.js related launch agents
      launchctl remove com.jeffbridwell.personal-website || true
      # Remove npm from login items (requires manual confirmation)
      echo "Please manually verify that Node.js and npm are removed from Login Items in System Settings > General > Login Items"
    EOT
  }

  # Also run cleanup on destroy
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      echo "Cleaning up processes..."
      pkill -f "npm run dev" || true
      pkill -f "nodemon server.js" || true
      pkill -f "/usr/local/bin/node server.js" || true
      launchctl remove com.jeffbridwell.personal-website || true
    EOT
  }
}

# Create development environment configuration
resource "local_file" "dev_env_config" {
  filename = "/Users/jeffbridwell/CascadeProjects/personal-website/.env.development"
  content  = <<-EOT
    NODE_ENV=development
    PORT=3001
    # Add any other environment-specific variables here
  EOT
}

# Start development server
resource "null_resource" "start_dev_server" {
  depends_on = [
    null_resource.install_dependencies,
    null_resource.cleanup_launch_agents,
    local_file.dev_env_config
  ]

  provisioner "local-exec" {
    command = <<-EOT
      # Kill any existing processes first
      pkill -f "npm run dev" || true
      pkill -f "nodemon server.js" || true
      pkill -f "/usr/local/bin/node server.js" || true
      
      # Wait to ensure processes are fully terminated
      sleep 3
      
      # Double check no processes are running
      if pgrep -f "nodemon server.js" > /dev/null || pgrep -f "npm run dev" > /dev/null; then
        echo "Error: Unable to clean up existing processes"
        exit 1
      fi
      
      # Start the server in the background
      cd /Users/jeffbridwell/CascadeProjects/personal-website && \
      mkdir -p logs && \
      (NODE_ENV=development PORT=3001 npm run dev >> logs/console.log 2>&1 & echo $! > /tmp/personal-website-dev.pid)
      
      # Wait for initial startup
      sleep 3
      
      # Check if the process is still running and verify no crash in logs
      if ! pgrep -f "nodemon server.js" > /dev/null || grep -q "app crashed" logs/console.log; then
        echo "Error: Server failed to start or crashed during startup"
        cat logs/console.log
        exit 1
      fi
      
      # Get the actual nodemon PID
      SERVER_PID=$(pgrep -f "nodemon server.js" || echo "")
      
      # Verify only one instance is running
      NODE_COUNT=$(pgrep -f "nodemon server.js" | wc -l | tr -d '[:space:]')
      if [ "$NODE_COUNT" -gt 1 ]; then
        echo "Error: Multiple server instances detected ($NODE_COUNT instances)"
        pkill -f "nodemon server.js"
        rm -f /tmp/personal-website-dev.pid
        exit 1
      fi
      
      # Store the PID and report success
      echo $SERVER_PID > /tmp/personal-website-dev.pid
      echo "Development server started successfully with PID: $SERVER_PID"
      
      # Try to connect to the server
      for i in {1..10}; do
        if curl -s http://localhost:3001/health > /dev/null; then
          echo "Server is responding to requests"
          exit 0
        fi
        sleep 1
      done
      
      echo "Error: Server is not responding to requests"
      cat logs/console.log
      exit 1
    EOT
  }

  # Ensure server is killed on destroy
  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      echo "Stopping development server..."
      if [ -f /tmp/personal-website-dev.pid ]; then
        PID=$(cat /tmp/personal-website-dev.pid)
        kill $PID 2>/dev/null || true
        rm -f /tmp/personal-website-dev.pid
      fi
      pkill -f "npm run dev" || true
      pkill -f "nodemon server.js" || true
      pkill -f "/usr/local/bin/node server.js" || true
      sleep 2
    EOT
  }
}
