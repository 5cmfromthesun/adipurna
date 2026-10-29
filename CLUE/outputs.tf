output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.photos.bucket
}

output "rds_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}
