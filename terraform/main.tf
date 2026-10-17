# Root Terraform Configuration - NTI DevOps Final Project

# 1. VPC Module (Subnets, NAT, IGW, Route Tables across 2 AZs)
module "vpc" {
  source       = "./modules/vpc"
  vpc_cidr     = var.vpc_cidr
  environment  = var.environment
  cluster_name = var.cluster_name
}

# 2. S3 Bucket Module for ELB Access Logs
module "s3_elb_logs" {
  source      = "./modules/s3_elb_logs"
  environment = var.environment
}

# 3. AWS ECR Private Repository Module
module "ecr" {
  source      = "./modules/ecr"
  environment = var.environment
}

# 4. AWS Secrets Manager Module (Generates and Stores RDS Credentials)
module "secrets_manager" {
  source      = "./modules/secrets_manager"
  environment = var.environment
  db_username = var.db_username
  db_name     = var.db_name
}

# 5. AWS EKS Cluster Module (2 Worker Nodes, ASG, Security Groups, OIDC)
module "eks" {
  source                  = "./modules/eks"
  cluster_name            = var.cluster_name
  cluster_version         = var.cluster_version
  environment             = var.environment
  vpc_id                  = module.vpc.vpc_id
  public_subnet_ids       = module.vpc.public_subnet_ids
  private_subnet_ids      = module.vpc.private_subnet_ids
  node_instance_types     = var.eks_node_instance_types
  desired_nodes           = var.eks_desired_nodes
  min_nodes               = var.eks_min_nodes
  max_nodes               = var.eks_max_nodes
}

# 6. AWS RDS PostgreSQL Module (In Private DB Subnets, Restricted to EKS Nodes)
module "rds" {
  source                     = "./modules/rds"
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  database_subnet_ids        = module.vpc.database_subnet_ids
  eks_node_security_group_id    = module.eks.node_security_group_id
  eks_cluster_security_group_id = module.eks.cluster_security_group_id
  db_name                    = var.db_name
  db_username                = var.db_username
  db_password                = module.secrets_manager.db_password
  db_instance_class          = var.db_instance_class
}

# 7. EC2 Instance for Jenkins Server Module
module "ec2_jenkins" {
  source           = "./modules/ec2_jenkins"
  environment      = var.environment
  vpc_id           = module.vpc.vpc_id
  public_subnet_id = module.vpc.public_subnet_ids[0]
  instance_type    = var.jenkins_instance_type
  ssh_key_name     = var.jenkins_ssh_key_name
}

# 8. AWS Backup Module (Daily Snapshot Plan for Jenkins Instance)
module "aws_backup" {
  source               = "./modules/aws_backup"
  environment          = var.environment
  jenkins_instance_arn = module.ec2_jenkins.instance_arn
}
