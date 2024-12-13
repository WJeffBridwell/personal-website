# Terraform Configuration for Personal Website Development Environment

This Terraform configuration manages the development environment for the personal website project.

## What it manages

1. Node.js installation via Homebrew
2. Project dependencies (npm packages)
3. Development environment configuration
4. Cleanup of any existing launch agents/daemons

## Usage

### Prerequisites

1. Install Terraform:
```bash
brew install terraform
```

2. Initialize Terraform:
```bash
cd terraform
terraform init
```

### Apply Configuration

To set up the development environment:
```bash
terraform apply
```

### Destroy Environment

To clean up the environment:
```bash
terraform destroy
```

## Configuration

You can modify the following variables in `variables.tf`:

- `node_version`: Version of Node.js to install
- `project_path`: Path to the project directory
- `development_port`: Port for development server

## Notes

- The configuration will prompt you to manually verify Login Items in System Settings
- Environment variables are stored in `.env.development`
- Node.js is installed via Homebrew
