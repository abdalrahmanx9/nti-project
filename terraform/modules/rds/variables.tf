variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where RDS is deployed"
  type        = string
}

variable "database_subnet_ids" {
  description = "List of isolated database subnet IDs"
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "Security Group ID of the EKS worker nodes to allow traffic from"
  type        = string
}

variable "eks_cluster_security_group_id" {
  description = "Security Group ID of the EKS cluster primary SG"
  type        = string
  default     = ""
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "ntiapp"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "Instance type for RDS"
  type        = string
  default     = "db.t3.micro"
}
