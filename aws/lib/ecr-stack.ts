import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';

import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class WatchTransactionECRStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repository = new ecr.Repository(this, 'WatchTransactionRepository', {
      repositoryName: 'watch-transaction',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}