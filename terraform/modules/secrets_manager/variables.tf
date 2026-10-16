variable "environment" {
  description = "Environment name"
  type        = string
}

variable "db_username" {
  description = "Master database username"
  type        = string
  default     = "dbadmin"
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "ntiapp"
}
