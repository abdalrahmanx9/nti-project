output "endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.postgres.endpoint
}

output "address" {
  description = "The hostname of the RDS instance"
  value       = aws_db_instance.postgres.address
}

output "port" {
  description = "The database port"
  value       = aws_db_instance.postgres.port
}

output "security_group_id" {
  description = "The security group ID of the RDS instance"
  value       = aws_security_group.rds.id
}
