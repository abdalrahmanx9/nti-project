output "vault_name" {
  description = "Name of the AWS Backup vault"
  value       = aws_backup_vault.jenkins.name
}

output "vault_arn" {
  description = "ARN of the AWS Backup vault"
  value       = aws_backup_vault.jenkins.arn
}

output "plan_id" {
  description = "ID of the AWS Backup daily plan"
  value       = aws_backup_plan.jenkins.id
}
