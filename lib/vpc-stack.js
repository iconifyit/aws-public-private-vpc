const cdk = require('aws-cdk-lib');
const { Stack, CfnOutput, Tags } = cdk;
const ec2 = require('aws-cdk-lib/aws-ec2');
const iam = require('aws-cdk-lib/aws-iam');
const lambda = require('aws-cdk-lib/aws-lambda');
const names = require('./names');
require('dotenv').config();

class VpcStack extends Stack {
    constructor(scope, id, props) {
        super(scope, id, props);

        // Create VPC
        const vpc = new ec2.Vpc(this, names.VPC_LOGICAL_ID, {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: names.PUBLIC_SUBNET_NAME,
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: names.PRIVATE_SUBNET_NAME,
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });

        // VPC Gateway Endpoint for S3
        vpc.addGatewayEndpoint(names.S3_ENDPOINT_NAME, {
            service: ec2.GatewayVpcEndpointAwsService.S3,
        });

        // ALB Security Group
        const albSG = new ec2.SecurityGroup(this, names.ALB_SECURITY_GROUP_NAME, {
            vpc,
            allowAllOutbound: true,
            description: 'Allow inbound HTTP/HTTPS from the internet',
        });
        albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        albSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
        Tags.of(albSG).add('Name', names.ALB_SECURITY_GROUP_TAG);

        // API Server Security Group
        const apiSG = new ec2.SecurityGroup(this, names.API_SECURITY_GROUP_NAME, {
            vpc,
            allowAllOutbound: true,
            description: 'Allow port 5002 only from ALB and SSH from admin IP',
        });

        // apiSG.addIngressRule(albSG, ec2.Port.tcp(5002), 'Allow API traffic from ALB');
        apiSG.addIngressRule(
            ec2.Peer.securityGroupId('sg-03f99d15c13aaf287'),
            ec2.Port.tcp(5002),
            'Allow API traffic from ALB'
        );
        apiSG.addIngressRule(ec2.Peer.ipv4(names.HOME_IP_CIDR), ec2.Port.tcp(22), 'Allow SSH from admin IP');
        Tags.of(apiSG).add('Name', names.API_SECURITY_GROUP_TAG);

        // Lambda Security Group
        const lambdaSG = new ec2.SecurityGroup(this, names.LAMBDA_SECURITY_GROUP_NAME, {
            vpc,
            allowAllOutbound: true,
            description: 'Outbound-only SG for Lambda functions',
        });
        Tags.of(lambdaSG).add('Name', names.LAMBDA_SECURITY_GROUP_TAG);

        // RDS Security Group (allows access from your IP)
        const rdsSG = new ec2.SecurityGroup(this, names.RDS_SECURITY_GROUP_NAME, {
            vpc,
            allowAllOutbound: true,
            description: 'Access to RDS Postgres from Admin IP only',
        });
        rdsSG.addIngressRule(ec2.Peer.ipv4(names.HOME_IP_CIDR), ec2.Port.tcp(5432));
        Tags.of(rdsSG).add('Name', names.RDS_SECURITY_GROUP_TAG);

        // IAM role for Lambda
        const lambdaRole = new iam.Role(this, names.TEST_LAMBDA_ROLE, {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
            ],
        });

        // Lambda function to test internet + S3 + RDS
        const testLambda = new lambda.Function(this, names.TEST_LAMBDA_NAME, {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
                const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
                const DB = require('@vectopus.com/db');

                exports.handler = async () => {
                    try {
                        // Test internet
                        console.log('--- fetch https://vectopus.com/api/health ---');
                        const response = await fetch('https://vectopus.com/api/health');
                        console.log('Status:', response.status);

                        // Test S3 access
                        console.log('--- List S3 buckets ---');
                        const s3 = new S3Client({});
                        const buckets = await s3.send(new ListBucketsCommand({}));
                        console.log('Buckets:', buckets.Buckets.map(b => b.Name).join(', '));

                        // Test DB
                        console.log('--- Connecting to RDS via DB package ---');
                        const res = await DB.knex.raw('SELECT NOW()');
                        console.log('RDS time:', res.rows[0]);
                    } 
                    catch (err) {
                        console.error('Test failed:', err);
                    }
                    return { statusCode: 200 };
                };
            `),
            vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [lambdaSG],
            role: lambdaRole,
            timeout: cdk.Duration.seconds(30),

            environment: {
                POSTGRES_HOST: process.env.POSTGRES_HOST || '',
                POSTGRES_USER: process.env.POSTGRES_USER || '',
                POSTGRES_PASS: process.env.POSTGRES_PASS || '',
                POSTGRES_DB: process.env.POSTGRES_DB || '',
                POSTGRES_PORT: process.env.POSTGRES_PORT || '5432',
                ENV_NAME: process.env.ENV_NAME || 'development',
                NODE_ENV: process.env.NODE_ENV || 'development',
            },
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(
                    this, 
                    'DependenciesLayer', 
                    'arn:aws:lambda:us-east-1:511873596089:layer:vectopus-dependencies:3'
                ),
                lambda.LayerVersion.fromLayerVersionArn(
                    this, 
                    'VectopusLibsLayer', 
                    'arn:aws:lambda:us-east-1:511873596089:layer:vectopus-libs:63'
                ),
            ],
        });

        // Outputs
        new CfnOutput(this, 'VpcId', { value: vpc.vpcId });
        new CfnOutput(this, 'PublicSubnetIds', {
            value: vpc.publicSubnets.map(s => s.subnetId).join(',')
        });
        new CfnOutput(this, 'PrivateSubnetIds', {
            value: vpc.privateSubnets.map(s => s.subnetId).join(',')
        });
        new CfnOutput(this, 'AlbSecurityGroupId', { value: albSG.securityGroupId });
        new CfnOutput(this, 'LambdaSecurityGroupId', { value: lambdaSG.securityGroupId });
        new CfnOutput(this, 'DbSecurityGroupId', { value: rdsSG.securityGroupId });
        new CfnOutput(this, 'TestLambdaName', { value: testLambda.functionName });
        new CfnOutput(this, 'ApiServerSecurityGroupId', { value: apiSG.securityGroupId });
    }
}

module.exports = { VpcStack };
