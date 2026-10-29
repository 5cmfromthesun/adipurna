# Module Guide: Adipurna Wholesale Store - DevOps/CICD

**Competition Theme:** DevOps / CICD  
**Target:** LKS Cloud Computing 2027  
**Application:** Adipurna Wholesale Web Store

## Table of Contents

- [Overview](#overview)
- [AWS Services Required](#aws-services-required)
- [Learning Objectives](#learning-objectives)
- [Implementation Steps](#implementation-steps)
  - [1. VPC (Virtual Private Cloud)](#1-vpc-virtual-private-cloud)
  - [2. S3 (Simple Storage Service)](#2-s3-simple-storage-service)
  - [3. RDS (Relational Database Service)](#3-rds-relational-database-service)
  - [4. ECR (Elastic Container Registry)](#4-ecr-elastic-container-registry)
  - [5. Secrets Manager](#5-secrets-manager)
  - [6. ECS (Elastic Container Service)](#6-ecs-elastic-container-service)
  - [7. GitHub & CI/CD](#7-github--cicd)
- [Additional Services](#additional-services)
- [Local Development](#local-development)
- [CLUE Folder](#clue-folder)
- [Additional Notes](#additional-notes)
- [References](#references)

## Overview

This module guides you through deploying the **Adipurna Wholesale Store** web application using AWS cloud services. You will learn how to provision infrastructure, containerize the application, and automate deployment using GitHub Actions.

## AWS Services Required

| Service | Purpose |
| --- | --- |
| **VPC** | Isolated network environment for all resources |
| **S3** | Object storage for product photos |
| **RDS (PostgreSQL)** | Relational database to store product data |
| **ECR** | Private Docker image registry |
| **ECS (Fargate)** | Container orchestration to run the application |
| **AWS Secrets Manager** | Securely store database credentials |
| **Application Load Balancer (ALB)** | Load balancing and traffic distribution |

**Additional Tools:** GitHub (Source Code Repository & CI/CD)

## Learning Objectives

By completing this module, you will be able to:

- Design and configure a secure VPC with public and private subnets
- Set up object storage with appropriate access policies
- Deploy and secure a managed PostgreSQL database
- Build, store, and manage Docker images using ECR
- Orchestrate containerized applications using ECS with Fargate
- Securely manage credentials using AWS Secrets Manager
- Implement a CI/CD pipeline using GitHub Actions
- Work with caching, messaging, and monitoring services

## Implementation Steps

### 1. VPC (Virtual Private Cloud)

Create a custom VPC with the following configuration:

| Resource | Configuration | Notes |
| --- | --- | --- |
| **VPC Name** | `lks-vpc-username` | Replace `username` with your own identifier |
| **CIDR Block** | `172.168.0.0/16` | Main network range |
| **Public Subnet 1** | `172.168.1.0/24` | Place in `us-east-1a` |
| **Public Subnet 2** | `172.168.2.0/24` | Place in `us-east-1b` |
| **Private Subnet 1** | `172.168.10.0/24` | Place in `us-east-1a` |
| **Private Subnet 2** | `172.168.20.0/24` | Place in `us-east-1b` |
| **Internet Gateway** | Attach to VPC | Required for ALB |
| **NAT Gateway** | Deploy in a public subnet | Required for ECS tasks in private subnets |
| **Route Tables** | Configure accordingly | Public to IGW, Private to NAT Gateway |

### 2. S3 (Simple Storage Service)

| Configuration | Value | Notes |
| --- | --- | --- |
| **Bucket Name** | `lks-photo-catalogue-username` | Must be globally unique |
| **Block Public Access** | Uncheck all options | Required for image access |
| **Bucket Policy** | Apply appropriate policy | Allow access as needed |

### 3. RDS (Relational Database Service)

| Configuration | Value | Notes |
| --- | --- | --- |
| **Engine** | PostgreSQL | Use recommended version |
| **DB Instance Identifier** | `lks-postgre-username` | Replace `username` |
| **Initial Database Name** | `tokodb` | Required by application |
| **Instance Class** | `db.t3.micro` | For LKS environment |
| **Connectivity** | Private Subnets | Not publicly accessible |
| **Security Group** | Allow port 5432 from ECS SG | Only from ECS tasks |

### 4. ECR (Elastic Container Registry)

| Configuration | Value | Notes |
| --- | --- | --- |
| **Repository Name** | `lks-ecr-username` | Replace `username` |

### 5. Secrets Manager

| Configuration | Value | Notes |
| --- | --- | --- |
| **Secret Name** | `lks-secret-username` | Replace `username` |
| **Secret Type** | Key/value pairs (JSON) | Store as JSON |
| **Required Keys** | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Must match exactly |
| **DB_PORT** | `5432` | Default PostgreSQL port |
| **DB_NAME** | `tokodb` | Must match RDS |

### 6. ECS (Elastic Container Service)

| Resource | Configuration | Notes |
| --- | --- | --- |
| **Cluster Name** | `lks-cluster-username` | Replace `username` |
| **Task Definition Name** | `lks-task-username` | Replace `username` |
| **Launch Type** | Fargate | Serverless |
| **Image** | `<account-id>.dkr.ecr.us-east-1.amazonaws.com/lks-ecr-username:latest` | From ECR |
| **Container Port** | `80` | Application port |
| **Network Mode** | `awsvpc` | Required for Fargate |
| **Service Name** | `lks-service-username` | Replace `username` |
| **Subnets** | Private Subnets | Run in private subnets |
| **Load Balancer** | Application Load Balancer | In public subnets, target on port 80 |

### 7. GitHub & CI/CD

| Step | Description | Notes |
| --- | --- | --- |
| **Repository** | Push source code and Dockerfile to GitHub | Include all files |
| **GitHub Secrets** | Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE` | Use IAM user with minimal permissions |
| **Workflow File** | Create `.github/workflows/deploy.yml` | Use example as reference |
| **Trigger** | On push to `main` branch | Builds, pushes to ECR, deploys to ECS |

## Additional Services

The application uses additional AWS services for enhanced functionality:

| Service | Purpose | Usage |
| --- | --- | --- |
| **Amazon ElastiCache (Redis)** | Caching layer | Cache product catalog for better performance |
| **Amazon SQS** | Message queue | Async order processing with Dead Letter Queue |
| **AWS Lambda** | Serverless function | Process orders from SQS queue |
| **Amazon CloudWatch** | Monitoring & logging | Logs, metrics, and alarms |
| **Amazon SNS** | Notifications | Alert notifications |
| **Amazon CloudFront** | CDN | Content delivery for static assets |
| **VPC Endpoints** | Private connectivity | Secure access to AWS services without NAT |

## Local Development

Before starting, make sure Docker is running.

```bash
docker compose up -d --build
```

Access the application at http://localhost:8080

Services used:
- PostgreSQL
- Redis
- Node.js App

Features available locally:
- Product catalog with cart
- Order management
- Admin panel with statistics
- Redis caching
- SQS queue integration ready
- Health checks at `/health` and `/health/detailed`

## CLUE Folder

Use `CLUE/` to provision base infrastructure for learning:

```bash
cd CLUE
terraform init
terraform plan
terraform apply
```

Resources provisioned:
- VPC, Public/Private Subnets, NAT Gateway, Route Tables
- ECR Repository
- S3 Bucket
- RDS PostgreSQL
- Secrets Manager
- ECS Cluster

Focus on building ALB, Task Definition, ECS Service, and deploying the application.

## Additional Notes

- **Security:** Use private subnets for RDS and ECS tasks. Only ALB should be internet-facing.
- **Credentials:** Never commit `.env` files. Use AWS Secrets Manager and GitHub Secrets.
- **Naming:** Replace `username` with your identifier consistently.
- **Health Check:** Application uses `/health` endpoint for ALB target group.
- **Caching:** Product data is cached in Redis (5 min TTL).
- **Orders:** Orders are queued to SQS for asynchronous processing.
- **Billing:** Destroy resources when not in use.

## References

- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS S3 Bucket Policy Examples](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html)
- [AWS ECS Developer Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html)
- [AWS RDS User Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
