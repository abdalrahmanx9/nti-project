# Root Terraform Outputs

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_name" {
  description = "EKS Cluster Name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS Control Plane Endpoint"
  value       = module.eks.cluster_endpoint
}

output "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC Provider for IRSA"
  value       = module.eks.oidc_provider_arn
}

output "ecr_repository_url" {
  description = "ECR Repository URL for pushing Docker images"
  value       = module.ecr.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint"
  value       = module.rds.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL hostname"
  value       = module.rds.address
}

output "rds_secret_arn" {
  description = "AWS Secrets Manager ARN storing RDS master credentials"
  value       = module.secrets_manager.secret_arn
}

output "jenkins_public_ip" {
  description = "Public Elastic IP address of the Jenkins automation server"
  value       = module.ec2_jenkins.public_ip
}

output "jenkins_instance_id" {
  description = "EC2 Instance ID of the Jenkins server"
  value       = module.ec2_jenkins.instance_id
}

output "elb_logs_s3_bucket" {
  description = "S3 Bucket storing Application Load Balancer access logs"
  value       = module.s3_elb_logs.bucket_name
}

output "aws_backup_vault_name" {
  description = "AWS Backup Vault holding daily snapshots"
  value       = module.aws_backup.vault_name
}

output "karpenter_node_role_name" {
  description = "Karpenter Node IAM Role name"
  value       = module.eks.karpenter_node_role_name
}

output "karpenter_controller_role_arn" {
  description = "Karpenter Controller IAM Role ARN for IRSA"
  value       = module.eks.karpenter_controller_role_arn
}

output "karpenter_interruption_queue_name" {
  description = "Karpenter SQS Interruption Queue name"
  value       = module.eks.karpenter_interruption_queue_name
}
