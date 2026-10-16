output "instance_id" {
  description = "ID of the Jenkins EC2 instance"
  value       = aws_instance.jenkins.id
}

output "instance_arn" {
  description = "ARN of the Jenkins EC2 instance"
  value       = aws_instance.jenkins.arn
}

output "public_ip" {
  description = "Elastic IP address of the Jenkins server"
  value       = aws_eip.jenkins.public_ip
}

output "security_group_id" {
  description = "Security group ID of the Jenkins server"
  value       = aws_security_group.jenkins.id
}
