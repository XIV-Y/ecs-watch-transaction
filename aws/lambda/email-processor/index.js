const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.TO_EMAIL;

exports.handler = async (event) => {
  console.log('Received SQS messages:', JSON.stringify(event, null, 2));
  
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const messageBody = JSON.parse(record.body);
      console.log('Processing message:', messageBody);
      
      await sendEmail(messageBody);
      
      console.log(`Message ${record.messageId} processed successfully`);
    } catch (error) {
      console.error(`Error processing message ${record.messageId}:`, error);
      
      batchItemFailures.push({
        itemIdentifier: record.messageId
      });
    }
  }
  
  if (batchItemFailures.length > 0) {
    console.log(`Reporting ${batchItemFailures.length} failed messages`);
    return {
      batchItemFailures: batchItemFailures
    };
  }
  
  return {
    statusCode: 200,
    body: 'All messages processed successfully'
  };
};

async function sendEmail(messageData) {
  const subject = messageData.subject || 'SQSメッセージ通知';
  const textBody = formatEmailBody(messageData);
  
  const emailParams = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [TO_EMAIL],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
        Html: {
          Data: formatHtmlEmailBody(messageData),
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(emailParams);
    const result = await sesClient.send(command);
    console.log('Email sent successfully:', result.MessageId);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

function formatEmailBody(messageData) {
  return `
メッセージ受信通知

受信時刻: ${new Date().toLocaleString('ja-JP')}

メッセージ内容:
${JSON.stringify(messageData, null, 2)}

---
このメールは自動送信されています。
  `.trim();
}

function formatHtmlEmailBody(messageData) {
  return `
    <html>
      <body>
        <h2>メッセージ受信通知</h2>
        <p><strong>受信時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
        
        <h3>メッセージ内容:</h3>
        <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
${JSON.stringify(messageData, null, 2)}
        </pre>
        
        <hr>
        <p style="color: #666; font-size: 12px;">このメールは自動送信されています。</p>
      </body>
    </html>
  `;
}
