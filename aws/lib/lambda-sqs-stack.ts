import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

import { Construct } from 'constructs';

export class LambdaSqsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ses.EmailIdentity(this, 'FromEmailIdentity', {
      identity: ses.Identity.email(process.env.FROM_EMAIL_ADDRESS ?? ''),
    });

    new ses.EmailIdentity(this, 'ToEmailIdentity', {
      identity: ses.Identity.email(process.env.TO_EMAIL_ADDRESS ?? ''),
    });

    const deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: 'email-processor-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // メインSQSキュー
    const queue = new sqs.Queue(this, 'MainQueue', {
      queueName: 'email-processor-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
      retentionPeriod: cdk.Duration.days(4),
    });

    const lambdaFunction = new lambda.Function(this, 'EmailProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/email-processor')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        FROM_EMAIL: process.env.FROM_EMAIL_ADDRESS ?? '',
        TO_EMAIL: process.env.TO_EMAIL_ADDRESS ?? ''
      },
    });

    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`,
        ],
      })
    );

    // SESの送信権限をLambdaに付与
    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
        ],
        resources: ['*'],
      })
    );

    // SQSトリガーをLambdaに追加
    lambdaFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(queue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    new logs.LogRetention(this, 'EmailProcessorLogRetention', {
      logGroupName: `/aws/lambda/${lambdaFunction.functionName}`,
      retention: logs.RetentionDays.ONE_WEEK,
    });
  }
}
