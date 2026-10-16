variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "Base CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "cluster_name" {
  description = "Name of the AWS EKS Cluster"
  type        = string
  default     = "nti-devops-eks"
}

variable "cluster_version" {
  description = "Kubernetes control plane version"
  type        = string
  default     = "1.30"
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_desired_nodes" {
  description = "Desired number of worker nodes in EKS Auto Scaling Group"
  type        = number
  default     = 2
}

variable "eks_min_nodes" {
  description = "Minimum number of worker nodes in EKS Auto Scaling Group"
  type        = number
  default     = 2
}

variable "eks_max_nodes" {
  description = "Maximum number of worker nodes in EKS Auto Scaling Group"
  type        = number
  default     = 4
}

variable "jenkins_instance_type" {
  description = "EC2 instance type for the Jenkins automation server"
  type        = string
  default     = "t3.large"
}

variable "jenkins_ssh_key_name" {
  description = "Optional AWS EC2 Key Pair name for SSH access to Jenkins instance"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "Database name for PostgreSQL RDS"
  type        = string
  default     = "ntiapp"
}

variable "db_username" {
  description = "Master username for PostgreSQL RDS"
  type        = string
  default     = "dbadmin"
}

variable "db_instance_class" {
  description = "Instance class for RDS PostgreSQL instance"
  type        = string
  default     = "db.t3.micro"
}
