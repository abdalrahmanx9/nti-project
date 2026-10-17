# 1. DB Subnet Group (Private Database Subnets)
resource "aws_db_subnet_group" "rds" {
  name        = "${var.environment}-rds-subnet-group"
  description = "Subnet group for RDS PostgreSQL across multiple AZs"
  subnet_ids  = var.database_subnet_ids

  tags = {
    Name = "${var.environment}-rds-subnet-group"
  }
}

# 2. RDS Security Group (Restricted strictly to EKS Worker Nodes)
resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-sg"
  description = "Controls inbound traffic to PostgreSQL RDS strictly from EKS nodes"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from EKS worker nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = compact([var.eks_node_security_group_id, var.eks_cluster_security_group_id])
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-rds-sg"
  }
}

# 3. PostgreSQL RDS Instance
resource "aws_db_instance" "postgres" {
  identifier        = "${var.environment}-postgres-db"
  engine            = "postgres"
  engine_version    = "15.7"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = false # Cost-effective for demo/testing
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false

  auto_minor_version_upgrade = true

  tags = {
    Name = "${var.environment}-postgres-instance"
  }
}
