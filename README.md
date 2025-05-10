# Vectopus VPC Stack Documentation

## 🧠 Design Philosophy & Architecture Rationale

The `VpcStack` is the backbone of the entire Vectopus infrastructure and reflects a deliberate architectural strategy grounded in three core principles:

### 1. Stack Ownership Boundaries

Each stack (VPC, EC2, ALB, etc.) owns only the resources it creates. For example:

* The **VPC stack** owns the security groups.
* The **EC2 stack** imports and uses these security groups *read-only*.
* The **ALB stack** uses the same pattern — importing security groups without taking ownership.

✅ This ensures no CDK stack can accidentally delete or modify shared infrastructure it doesn't own.

### 2. Zero Tolerance for Destructive Changes

All stacks are carefully written to:

* Use `fromXxx()` methods to **import existing resources** instead of recreating them.
* Avoid default behavior that auto-creates unmanaged resources (e.g., auto-generated SGs by the ALB).
* Validate assumptions using logical names and explicit tags.

This allows safe rollbacks, re-deploys, and disaster recovery without fear of data loss or broken infrastructure.

### 3. Defense-in-Depth Security

Security group rules are crafted to follow least privilege:

* The **API server only allows** traffic on port 5002 from the **ALB’s SG** and SSH on port 22 from the admin IP.
* The **RDS instance only allows** connections from the admin IP.
* **Public subnets** are carefully separated from **private subnets**, ensuring Lambda and DB access flows securely through defined paths.

🛡️ Even if an EC2 instance or Lambda is compromised, the blast radius is limited by design.

### 4. Everything Is Documented and Reproducible

All VPC components — subnets, security groups, roles, and outputs — are declared with:

* Explicit naming
* Tagged consistently
* Output to the CloudFormation console and `.env` pipeline

Combined with the architectural diagrams (coming soon), this provides a single source of truth for future developers or disaster recovery efforts.

---

## VPC Stack Overview

This stack defines the foundational networking infrastructure for Vectopus.

### VPC

* **CIDR Block:** `10.0.0.0/16`
* **AZs:** 2 (auto-selected)
* **Subnets:**

  * `PublicSubnet` × 2 (one per AZ)
  * `PrivateSubnet` × 2 (one per AZ)
* **NAT Gateway:** 1 (shared)

### Subnet Configuration

* Public: `cidrMask: 24`, internet-facing, used for ALB and EC2
* Private: `cidrMask: 24`, used for Lambda and RDS

### Gateway Endpoints

* `S3`: Enables private access to S3 without NAT traversal

### Security Groups

#### ALB SG (`sg-alb`)

* Port 80: open to 0.0.0.0/0
* Port 443: open to 0.0.0.0/0
* Fully owned by the VPC stack

#### API Server SG (`sg-api`)

* Port 5002: ALB SG only
* Port 22: Admin IP only

#### Lambda SG (`sg-lambda`)

* Egress only
* Used by test Lambda function

#### RDS SG (`sg-rds`)

* Port 5432: Admin IP only

### IAM Role

* `TestLambdaRole`: Grants Lambda S3 read and basic execution rights

### Lambda Test Function

* Verifies VPC routing, S3 access, and DB connectivity
* Depends on environment vars via `.env` file

### Outputs

* VPC ID, Subnet IDs (public/private)
* Security Group IDs (ALB, API, Lambda, RDS)
* Test Lambda name

## Shared Constants: lib/names.js

To reduce duplication and maintain consistency across stacks, we use a shared constants file (names.js) that defines logical IDs, tag values, security group names, subnet identifiers, and other reusable configuration values. This centralization ensures that all infrastructure components reference the same identifiers, making the architecture easier to understand, maintain, and extend.

Note: While names.js could be more accurately named constants.js, we’ve retained the original name for historical reasons. Feel free to rename it as a future improvement if it aligns better with your team’s conventions.
