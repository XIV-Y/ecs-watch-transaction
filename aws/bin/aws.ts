#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WatchTransactionStack } from '../lib/ecs-stack';
import { WatchTransactionECRStack } from '../lib/ecr-stack';
import { EcsMonitoringStack } from '../lib/ecs-monitoring-stack';
import { LogsAlertStack } from '../lib/logs-alert-stack';
import { LambdaSqsStack } from '../lib/lambda-sqs-stack';

const app = new cdk.App();

new WatchTransactionECRStack(app, 'WatchTransactionECRStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new LambdaSqsStack(app, 'LambdaSqsStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new WatchTransactionStack(app, 'WatchTransactionStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new EcsMonitoringStack(app, 'EcsMonitoringStack', {
  clusterName: 'WatchTransactionCluster',
  serviceName: 'WatchTransactionService', 
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

new LogsAlertStack(app, 'LogsAlertStack', {
  logGroupName: '/ecs/watch-transaction',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
