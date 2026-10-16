variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where EKS is deployed"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private worker subnet IDs"
  type        = list(string)
}

variable "node_instance_types" {
  description = "Instance types for worker nodes"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "desired_nodes" {
  description = "Desired number of worker nodes (ASG)"
  type        = number
  default     = 2
}

variable "min_nodes" {
  description = "Minimum number of worker nodes (ASG)"
  type        = number
  default     = 2
}

variable "max_nodes" {
  description = "Maximum number of worker nodes (ASG)"
  type        = number
  default     = 4
}
