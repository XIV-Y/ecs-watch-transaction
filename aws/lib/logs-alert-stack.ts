import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';

import { Construct } from 'constructs';

export interface LogsAlertStackProps extends cdk.StackProps {
  logGroupName: string;
}

export class LogsAlertStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LogsAlertStackProps) {
    super(scope, id, props);

    const logGroup = logs.LogGroup.fromLogGroupName(
      this, 
      'ExistingLogGroup', 
      props.logGroupName
    );

    const alertTopic = new sns.Topic(this, 'LogAlertTopic', {
      topicName: 'mint-1-log-alerts',
      displayName: 'MINT-1 Log Detection Alerts'
    });

    const slackChannel = new chatbot.SlackChannelConfiguration(this, 'SlackChannel', {
      slackChannelConfigurationName: 'mint-1-alerts',
      slackWorkspaceId: process.env.SLACK_WORKSPACE_ID ?? '',
      slackChannelId: process.env.SLACK_ALERT_CHANNEL_ID ?? '',
      notificationTopics: [alertTopic],
      loggingLevel: chatbot.LoggingLevel.INFO
    });

    const metricFilter = new logs.MetricFilter(this, 'MINT1MetricFilter', {
      logGroup: logGroup,
      filterPattern: logs.FilterPattern.allTerms('MINT-1'),
      metricNamespace: 'CustomLogs/MINT',
      metricName: 'MINT-1-Occurrences',
      metricValue: '1',
      defaultValue: 0
    });

    const mint1Metric = new cdk.aws_cloudwatch.Metric({
      namespace: 'CustomLogs/MINT',
      metricName: 'MINT-1-Occurrences',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1)
    });

    const mint1Alarm = new cdk.aws_cloudwatch.Alarm(this, 'MINT1Alarm', {
      alarmName: 'MINT-1-Detection',
      alarmDescription: 'MINT-1 string detected in CloudWatch Logs',
      metric: mint1Metric,
      threshold: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
    });

    mint1Alarm.addAlarmAction(
      new cdk.aws_cloudwatch_actions.SnsAction(alertTopic)
    );
  }
}
