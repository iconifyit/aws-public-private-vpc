# VPC~ Design Goals:

1.	A named VPC with DNS hostnames and support enabled.
2.	2 public subnets (in different AZs) with internet access.
3.	2 private subnets (in different AZs) with NAT access to the internet.
4.	Internet Gateway (IGW) for public subnet egress.
5.	NAT Gateway in Public Subnet A for private subnet egress.
6.	Security Groups:
    •	AlbSecurityGroup: Ingress from 0.0.0.0/0 on ports 80/443.
    •	Ec2SecurityGroup: Ingress from ALB SG only. No public access.
    •	LambdaSecurityGroup: Can egress to internet and ingress to DB.
    •	DbSecurityGroup: Accepts ingress from EC2 and Lambda SGs on port 5432.~