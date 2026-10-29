# CLUE - Base Infrastructure

Minimal Terraform to provision base AWS resources for ECS lab.

## Resources Provisioned
- VPC with public and private subnets (2 AZs)
- Internet Gateway and NAT Gateway
- Route tables
- ECR Repository
- S3 Bucket
- RDS PostgreSQL
- Secrets Manager
- ECS Cluster

## Usage
```bash
terraform init
terraform plan
terraform apply
```

Trainees can focus on creating ALB, Task Definition, ECS Service, and deploying the app.
