import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dotenv from 'dotenv';

import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

dotenv.config();

export class WatchTransactionStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });


    const repository = ecr.Repository.fromRepositoryName(
      this,
      'WatchTransactionRepository',
      'watch-transaction'
    );

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'WatchTransactionCluster',
    });

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: '/ecs/watch-transaction',
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sqs:SendMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
        ],
        resources: [
          `arn:aws:sqs:${this.region}:${this.account}:email-processor-queue`,
          `arn:aws:sqs:${this.region}:${this.account}:email-processor-dlq`,
        ],
      })
    );

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole,
    });

    taskDef.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'watch-transaction',
        logGroup,
      }),
      environment: {
        INFURA_URL: process.env.INFURA_URL ?? '',
        CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS ?? '',
        QUEUE_URL: process.env.QUEUE_URL ?? '',
      },
    });

    new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      assignPublicIp: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      serviceName: 'WatchTransactionService',
    });
  }
}