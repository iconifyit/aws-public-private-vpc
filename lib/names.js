// names.js
// Centralized constants for VPC and security group logical names, tags, and outputs

module.exports = {
    // VPC
    VPC_LOGICAL_ID: 'VectoplusVpc',
    PUBLIC_SUBNET_NAME: 'PublicSubnet',
    PRIVATE_SUBNET_NAME: 'PrivateSubnet',
    S3_ENDPOINT_NAME: 'S3Endpoint',
  
    // Security Group logical IDs
    ALB_SECURITY_GROUP_NAME: 'AlbSecurityGroup',
    LAMBDA_SECURITY_GROUP_NAME: 'LambdaSecurityGroup',
    RDS_SECURITY_GROUP_NAME: 'RdsSecurityGroup',
  
    // Security Group tag values
    ALB_SECURITY_GROUP_TAG: 'sg-alb',
    LAMBDA_SECURITY_GROUP_TAG: 'sg-lambda',
    RDS_SECURITY_GROUP_TAG: 'sg-rds',
  
    // CIDR block for manual DB access
    HOME_IP_CIDR: '173.53.111.236/32',

    TEST_LAMBDA_ROLE: 'TestLambdaRole',
    TEST_LAMBDA_NAME: 'TestVpcLambda',
    TEST_LAMBDA_LOG_GROUP: 'TestLambdaLogGroup',
    TEST_LAMBDA_LOG_STREAM: 'TestLambdaLogStream',
  };