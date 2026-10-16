output "secret_arn" {
  description = "ARN of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "secret_name" {
  description = "Name of the Secrets Manager secret"
  value       = aws_secretsmanager_secret.db_credentials.name
}

output "db_password" {
  description = "Generated master database password"
  value       = random_password.db_password.result
  sensitive   = true
}

output "db_username" {
  description = "Master database username"
  value       = var.db_username
}
