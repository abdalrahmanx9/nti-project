# 1. IAM Role for AWS Backup Service
resource "aws_iam_role" "backup" {
  name = "${var.environment}-aws-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_service_role" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup.name
}

resource "aws_iam_role_policy_attachment" "backup_restore_role" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
  role       = aws_iam_role.backup.name
}

# 2. AWS Backup Vault
resource "aws_backup_vault" "jenkins" {
  name = "${var.environment}-jenkins-backup-vault"

  tags = {
    Name = "${var.environment}-jenkins-backup-vault"
  }
}

# 3. AWS Backup Plan (Daily Snapshot with 7-Day Retention)
resource "aws_backup_plan" "jenkins" {
  name = "${var.environment}-jenkins-daily-backup-plan"

  rule {
    rule_name         = "daily_snapshot_rule"
    target_vault_name = aws_backup_vault.jenkins.name
    schedule          = "cron(0 1 * * ? *)" # Runs daily at 01:00 UTC

    lifecycle {
      delete_after = 7 # 7-day retention period
    }
  }

  tags = {
    Name = "${var.environment}-jenkins-daily-plan"
  }
}

# 4. AWS Backup Selection (Selects Jenkins EC2 Instance and resources tagged Backup=true)
resource "aws_backup_selection" "jenkins" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.environment}-jenkins-selection"
  plan_id      = aws_backup_plan.jenkins.id

  resources = [
    var.jenkins_instance_arn
  ]

  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }
}
