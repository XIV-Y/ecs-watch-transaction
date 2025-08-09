import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';

export interface EcsMonitoringStackProps extends cdk.StackProps {
  clusterName: string;
  serviceName: string;
}

export class EcsMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsMonitoringStackProps) {
    super(scope, id, props);

    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${props.serviceName}-low-cpu-alerts`,
      displayName: `${props.serviceName} Low CPU Alerts`
    });

    const slackChannel = new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
      slackChannelConfigurationName: `${props.serviceName}-alerts`,
      slackWorkspaceId: process.env.SLACK_WORKSPACE_ID ?? '',
      slackChannelId: process.env.SLACK_CHANNEL_ID ?? '',
      notificationTopics: [alertTopic],
      loggingLevel: chatbot.LoggingLevel.ERROR
    });

    slackChannel.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:Describe*',
        'cloudwatch:Get*',
        'cloudwatch:List*'
      ],
      resources: ['*']
    }));

    // ECSサービスのCPU使用率メトリクス
    const cpuMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        ServiceName: props.serviceName,
        ClusterName: props.clusterName
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5) // 5分間隔でサンプリング
    });

    // CPU使用率が80%以下の場合のアラーム
    const lowCpuAlarm = new cloudwatch.Alarm(this, 'LowCpuAlarm', {
      alarmName: `${props.serviceName}-low-cpu-usage`,
      alarmDescription: `ECS Service ${props.serviceName} CPU usage is below 80% for 10 minutes`,
      metric: cpuMetric,
      threshold: 80,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1, // 5分間隔で1回の評価
      treatMissingData: cloudwatch.TreatMissingData.BREACHING
    });

    lowCpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));
  }
}
