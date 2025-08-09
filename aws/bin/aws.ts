#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WatchTransactionStack } from '../lib/ecs-stack';
import { WatchTransactionECRStack } from '../lib/ecr-stack';
import { EcsMonitoringStack } from '../lib/ecs-monitoring-stack';

const app = new cdk.App();

new WatchTransactionECRStack(app, 'WatchTransactionECRStack', {
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