variable "environment" {
  description = "Environment name"
  type        = string
}

variable "bucket_prefix" {
  description = "Prefix for the S3 bucket"
  type        = string
  default     = "nti-elb-access-logs"
}
