# 1. Fetch latest Ubuntu 24.04 LTS (Noble Numbat) AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 2. Security Group for Jenkins (SSH & Port 8080)
resource "aws_security_group" "jenkins" {
  name        = "${var.environment}-jenkins-sg"
  description = "Security group for Jenkins automation server"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Can be restricted to admin IP
  }

  ingress {
    description = "Jenkins Web Dashboard"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-jenkins-sg"
  }
}

# 3. IAM Role for Jenkins Server (ECR, CloudWatch, EKS, Secrets)
resource "aws_iam_role" "jenkins" {
  name = "${var.environment}-jenkins-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Attach ECR push/pull permissions
resource "aws_iam_role_policy_attachment" "jenkins_ecr" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
  role       = aws_iam_role.jenkins.name
}

# Attach CloudWatch Agent logging/metrics permissions
resource "aws_iam_role_policy_attachment" "jenkins_cloudwatch" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
  role       = aws_iam_role.jenkins.name
}

# Attach SSM Core permissions for Systems Manager management
resource "aws_iam_role_policy_attachment" "jenkins_ssm" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  role       = aws_iam_role.jenkins.name
}

# Custom Policy for EKS describe and Secrets Manager read
resource "aws_iam_policy" "jenkins_extra" {
  name        = "${var.environment}-jenkins-extra-policy"
  description = "Allows Jenkins to describe EKS clusters and read secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "jenkins_extra_attach" {
  policy_arn = aws_iam_policy.jenkins_extra.arn
  role       = aws_iam_role.jenkins.name
}

resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.environment}-jenkins-instance-profile"
  role = aws_iam_role.jenkins.name
}

# 4. Jenkins EC2 Instance (Tagged for AWS Backup snapshot)
resource "aws_instance" "jenkins" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  subnet_id            = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  iam_instance_profile = aws_iam_instance_profile.jenkins.name
  key_name             = var.ssh_key_name != "" ? var.ssh_key_name : null

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
    tags = {
      Name   = "${var.environment}-jenkins-root-vol"
      Backup = "true"
    }
  }

  tags = {
    Name        = "${var.environment}-jenkins-server"
    Role        = "CI/CD-Automation"
    Backup      = "true" # Target key for AWS Backup Daily Plan
    Environment = var.environment
  }
}

# 5. Elastic IP for Persistent Jenkins Public Address
resource "aws_eip" "jenkins" {
  domain   = "vpc"
  instance = aws_instance.jenkins.id

  tags = {
    Name = "${var.environment}-jenkins-eip"
  }
}
