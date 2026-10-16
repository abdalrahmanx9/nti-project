output "bucket_name" {
  description = "Name of the S3 bucket storing ELB access logs"
  value       = aws_s3_bucket.elb_logs.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket storing ELB access logs"
  value       = aws_s3_bucket.elb_logs.arn
}
