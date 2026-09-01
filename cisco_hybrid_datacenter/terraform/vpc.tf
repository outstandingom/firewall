# vpc.tf - Network Segmentation using Hub-and-Spoke

provider "aws" {
  region = "us-east-1"
}

# 1. Transit Gateway (The Hub)
resource "aws_ec2_transit_gateway" "tgw" {
  description                     = "Hybrid Datacenter Transit Gateway"
  auto_accept_shared_attachments  = "enable"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  tags = {
    Name = "hybrid-tgw"
  }
}

# 2. Shared Services VPC (Active Directory, CI/CD, Monitoring)
resource "aws_vpc" "shared_services" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "Shared-Services-VPC" }
}

# 3. Application A VPC (Segmented)
resource "aws_vpc" "app_a" {
  cidr_block           = "10.2.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "App-A-VPC" }
}

# 4. Attach VPCs to Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "shared_services_attachment" {
  subnet_ids         = [aws_subnet.shared_private.id]
  transit_gateway_id = aws_ec2_transit_gateway.tgw.id
  vpc_id             = aws_vpc.shared_services.id
}

resource "aws_ec2_transit_gateway_vpc_attachment" "app_a_attachment" {
  subnet_ids         = [aws_subnet.app_a_private.id]
  transit_gateway_id = aws_ec2_transit_gateway.tgw.id
  vpc_id             = aws_vpc.app_a.id
}

# Subnets for App A (Example of Tiered Architecture)
resource "aws_subnet" "app_a_public" {
  vpc_id     = aws_vpc.app_a.id
  cidr_block = "10.2.1.0/24"
  tags       = { Name = "App-A-Public-Subnet" } # Only for Load Balancers/NAT
}

resource "aws_subnet" "app_a_private" {
  vpc_id     = aws_vpc.app_a.id
  cidr_block = "10.2.2.0/24"
  tags       = { Name = "App-A-Private-Subnet" } # For K8s Nodes / App VMs
}

resource "aws_subnet" "app_a_data" {
  vpc_id     = aws_vpc.app_a.id
  cidr_block = "10.2.3.0/24"
  tags       = { Name = "App-A-Data-Subnet" } # For RDS/Databases
}

# Shared Services Subnet
resource "aws_subnet" "shared_private" {
  vpc_id     = aws_vpc.shared_services.id
  cidr_block = "10.1.1.0/24"
  tags       = { Name = "Shared-Private-Subnet" }
}
