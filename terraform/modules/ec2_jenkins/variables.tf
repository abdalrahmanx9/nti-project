variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where Jenkins EC2 is deployed"
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet ID for Jenkins server"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "ssh_key_name" {
  description = "Optional EC2 Key Pair for SSH access"
  type        = string
  default     = ""
}
