data "aws_elb_service_account" "main" {}
data "aws_caller_identity" "current" {}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# 1. Dedicated S3 Bucket for ELB Access Logs
resource "aws_s3_bucket" "elb_logs" {
  bucket        = "${var.bucket_prefix}-${var.environment}-${random_string.suffix.result}"
  force_destroy = true

  tags = {
    Name = "${var.environment}-elb-access-logs"
  }
}

# 2. Block Public Access
resource "aws_s3_bucket_public_access_block" "elb_logs" {
  bucket = aws_s3_bucket.elb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. Server-Side Encryption (AES256)
resource "aws_s3_bucket_server_side_encryption_configuration" "elb_logs" {
  bucket = aws_s3_bucket.elb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 4. Lifecycle Configuration (Retain logs for 30 days)
resource "aws_s3_bucket_lifecycle_configuration" "elb_logs" {
  bucket = aws_s3_bucket.elb_logs.id

  rule {
    id     = "expire-logs-30-days"
    status = "Enabled"

    filter {}

    expiration {
      days = 30
    }
  }
}

# 5. Bucket Policy Granting ELB Delivery Service Permission to Write Access Logs
resource "aws_s3_bucket_policy" "elb_logs" {
  bucket = aws_s3_bucket.elb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowELBServiceAccountWrite"
        Effect    = "Allow"
        Principal = {
          AWS = data.aws_elb_service_account.main.arn
        }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.elb_logs.arn}/*"
      },
      {
        Sid       = "AllowALBLogDeliveryWrite"
        Effect    = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.elb_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      },
      {
        Sid       = "AllowALBLogDeliveryAclCheck"
        Effect    = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action    = "s3:GetBucketAcl"
        Resource  = aws_s3_bucket.elb_logs.arn
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.elb_logs]
}
