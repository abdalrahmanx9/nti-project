variable "environment" {
  description = "Environment name"
  type        = string
}

variable "jenkins_instance_arn" {
  description = "ARN of the Jenkins EC2 instance to back up"
  type        = string
}
