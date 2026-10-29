variable "aws_region" {
  default = "ap-southeast-1"
}

variable "project_name" {
  default = "lks-adipurna"
}

variable "environment" {
  default = "lab"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "azs" {
  default = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "public_subnet_cidrs" {
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  default = ["10.0.10.0/24", "10.0.20.0/24"]
}
