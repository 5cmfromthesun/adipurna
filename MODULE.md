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

## Implementation Steps

### 1. VPC (Virtual Private Cloud)

Create a custom VPC with the following configuration:

| Resource | Configuration | Notes |
| --- | --- | --- |
| **VPC Name** | `lks-vpc-username` | Replace `username` with your own identifier |
| **CIDR Block** | `172.168.0.0/16` | Main network range |
| **Public Subnet 1** | `172.168.1.0/24` | Place in `us-east-1a` |
| **Public Subnet 2** | `172.168.2.0/24` | Place in `us-east-1b` (recommended for high availability) |
| **Private Subnet 1** | `172.168.10.0/24` | Place in `us-east-1a` |
| **Private Subnet 2** | `172.168.20.0/24` | Place in `us-east-1b` (recommended for high availability) |
| **Internet Gateway** | Attach to VPC | Required for the Application Load Balancer to access the internet |
| **NAT Gateway** | Deploy in a public subnet | Required for ECS tasks in private subnets to pull images and access AWS services |
| **Route Tables** | Configure accordingly | Public subnets route to IGW. Private subnets route to the NAT Gateway |

> **Tip:** For the Load Balancer and ECS Fargate, it is recommended to use at least 2 Availability Zones.

### 2. S3 (Simple Storage Service)

Create an S3 bucket for storing product images:

| Configuration | Value | Notes |
| --- | --- | --- |
| **Bucket Name** | `lks-photo-catalogue-username` | Must be globally unique |
| **Block Public Access** | **Uncheck all options** | Required for image access from the application |
| **Bucket Policy** | Apply an appropriate bucket policy | Allow public read access to objects, or use presigned URLs as appropriate |

> **Note:** Ensure your bucket policy is correctly configured to avoid unnecessary exposure.

### 3. RDS (Relational Database Service)

Deploy a PostgreSQL database instance:

| Configuration | Value | Notes |
| --- | --- | --- |
| **Engine** | PostgreSQL | Use the recommended stable version |
| **DB Instance Identifier** | `lks-postgre-username` | Replace `username` with your identifier |
| **Initial Database Name** | `tokodb` | Required by the application |
| **Instance Class** | `db.t3.micro` | Suitable for the LKS environment |
| **Storage** | 20 GB (General Purpose SSD) | Sufficient for testing |
| **Connectivity** | Private Subnets | Do **NOT** make it publicly accessible |
| **Security Group** | Allow PostgreSQL (port 5432) | Only allow inbound traffic from the ECS security group |
| **Master Username/Password** | Set securely | Store these credentials in AWS Secrets Manager |

### 4. ECR (Elastic Container Registry)

Create a private container registry:

| Configuration | Value | Notes |
| --- | --- | --- |
| **Repository Name** | `lks-ecr-username` | Replace `username` with your identifier |
| **Visibility** | Private | Recommended for security |

### 5. Secrets Manager

Store database credentials securely:

| Configuration | Value | Notes |
| --- | --- | --- |
| **Secret Name** | `lks-secret-username` | Replace `username` with your identifier |
| **Secret Type** | Other type of secret (Key/value pairs) | Store as JSON |
| **Required Keys** | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Must match these exact keys for application compatibility |
| **DB_PORT** | `5432` | Default PostgreSQL port |
| **DB_NAME** | `tokodb` | Must match the RDS initial database name |

### 6. ECS (Elastic Container Service)

Deploy the containerized application using ECS with AWS Fargate:

| Resource | Configuration | Notes |
| --- | --- | --- |
| **Cluster Name** | `lks-cluster-username` | Replace `username` with your identifier |
| **Task Definition Name** | `lks-task-username` | Replace `username` with your identifier |
| **Launch Type** | Fargate | Serverless container compute |
| **Image** | `<account-id>.dkr.ecr.us-east-1.amazonaws.com/lks-ecr-username:latest` | Image pushed from ECR |
| **Container Port** | `80` | The application listens on port 80 |
| **Network Mode** | `awsvpc` | Required for Fargate |
| **Task Execution Role** | Create/Attach IAM Role | Must have permission to pull images from ECR and read secrets from Secrets Manager |
| **Task Role** | Create/Attach IAM Role | Must have permission to access the S3 bucket |
| **Service Name** | `lks-service-username` | Replace `username` with your identifier |
| **Service Type** | Fargate Service | Used to run and maintain the desired number of tasks |
| **Subnets** | Private Subnets | Run ECS tasks in private subnets for better security |
| **Security Group** | Allow HTTP (80) from ALB | Only the Application Load Balancer should be able to reach the tasks |
| **Load Balancer** | Application Load Balancer (ALB) | Place in public subnets and target the ECS service on port 80 |
| **Desired Count** | `1` or `2` | Adjust based on requirements |

### 7. GitHub & CI/CD

Automate the build and deployment process:

| Step | Description | Notes |
| --- | --- | --- |
| **Repository** | Push the application source code and `Dockerfile` to your GitHub repository | Ensure all required files are committed |
| **GitHub Secrets** | Add the following secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE` | Use an IAM user with minimal permissions (ECR push and ECS update-service) |
| **Workflow File** | Create `.github/workflows/deploy.yml` | Use the provided `deploy.yml.example` as a reference |
| **Workflow Actions** | Build the Docker image, push it to ECR, and trigger a new deployment to the ECS service | Configure to trigger on push to the `main` branch |
| **Environment Variables** | Do **not** commit real credentials to GitHub | Always use GitHub Secrets and AWS Secrets Manager |

## Additional Notes

- **Security First:** Use private subnets for RDS and ECS tasks. Only the Application Load Balancer should be exposed to the internet.
- **Credentials:** Never commit `.env` files with real credentials to your repository. Always rely on AWS Secrets Manager and GitHub Secrets.
- **Naming Convention:** Replace `username` with your own identifier consistently across all AWS resources.
- **Health Check:** The application exposes a health check endpoint at `/health`, which should be used for the ALB target group health checks.
- **S3 Access:** The application uses the AWS SDK default credential chain. Ensure your ECS Task Role has the correct S3 permissions.
- **Database Initialization:** On startup, the application automatically creates the `products` table if it does not exist.
- **Cost Awareness:** To avoid unnecessary billing, delete or destroy resources once testing is complete.

## References

- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS S3 Bucket Policy Examples](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html)
- [AWS ECS Developer Guide](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html)
- [AWS RDS User Guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
