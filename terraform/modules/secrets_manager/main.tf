# 1. Generate High-Entropy DB Password
resource "random_password" "db_password" {
  length           = 18
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# 2. AWS Secrets Manager Secret Container
resource "aws_secretsmanager_secret" "db_credentials" {
  name_prefix             = "${var.environment}-rds-credentials-"
  description             = "Master credentials for RDS PostgreSQL instance"
  recovery_window_in_days = 0 # For immediate cleanup if destroyed in lab/eval

  tags = {
    Name = "${var.environment}-rds-secret"
  }
}

# 3. Secret Version Storing JSON Payload
resource "aws_secretsmanager_secret_version" "db_credentials_version" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    dbname   = var.db_name
    port     = 5432
    engine   = "postgres"
  })
}
