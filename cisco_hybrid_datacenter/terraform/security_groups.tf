# security_groups.tf - Compute Level Segmentation

# 1. Application Load Balancer Security Group (Public facing)
resource "aws_security_group" "alb_sg" {
  name        = "app-a-alb-sg"
  description = "Allow inbound HTTPS from internet"
  vpc_id      = aws_vpc.app_a.id

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "Allow traffic to K8s Nodes"
    from_port       = 30000
    to_port         = 32767
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s_node_sg.id]
  }
}

# 2. Kubernetes Node Security Group (Private App Layer)
resource "aws_security_group" "k8s_node_sg" {
  name        = "app-a-k8s-node-sg"
  description = "Allow traffic from ALB and internal K8s traffic"
  vpc_id      = aws_vpc.app_a.id

  ingress {
    description     = "Allow inbound from ALB"
    from_port       = 30000
    to_port         = 32767
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  ingress {
    description = "Allow inter-node communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }
}

# 3. Database Security Group (Private Data Layer)
resource "aws_security_group" "db_sg" {
  name        = "app-a-db-sg"
  description = "Allow inbound only from specific K8s Nodes"
  vpc_id      = aws_vpc.app_a.id

  ingress {
    description     = "PostgreSQL from App A K8s Nodes ONLY"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s_node_sg.id]
  }
}
