const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

const queueUrl = process.env.SQS_QUEUE_URL;

const sendOrderToQueue = async (orderData) => {
  if (!queueUrl) {
    console.log('SQS_QUEUE_URL not configured, skipping queue');
    return null;
  }
  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(orderData),
      MessageAttributes: {
        OrderType: {
          DataType: 'String',
          StringValue: 'product_order'
        }
      }
    });
    const response = await sqsClient.send(command);
    console.log('Order sent to SQS:', response.MessageId);
    return response.MessageId;
  } catch (err) {
    console.error('Failed to send message to SQS:', err.message);
    throw err;
  }
};

module.exports = { sendOrderToQueue };
