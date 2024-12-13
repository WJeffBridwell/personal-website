# Add any variables that might need to be customized
variable "node_version" {
  description = "Version of Node.js to install"
  type        = string
  default     = "20"
}

variable "project_path" {
  description = "Path to the project directory"
  type        = string
  default     = "/Users/jeffbridwell/CascadeProjects/personal-website"
}

variable "development_port" {
  description = "Port for development server"
  type        = number
  default     = 3001
}
