variable "repository_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "nti-devops-app"
}

variable "environment" {
  description = "Environment name"
  type        = string
}
