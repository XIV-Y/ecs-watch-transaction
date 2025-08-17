
import { ethers } from 'ethers';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

import 'dotenv/config';

interface TransferEvent {
  from: string;
  to: string;
  tokenId: string;
  transactionHash: string;
  blockNumber: number;
}

const INFURA_URL = `wss://sepolia.infura.io/ws/v3/${process.env.INFURA_URL}`
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS
const QUEUE_URL = process.env.QUEUE_URL

const ERC721_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

class ERC721TransferListener {
  private provider: ethers.WebSocketProvider;
  private contract: ethers.Contract;
  private sqsClient: SQSClient;

  constructor(providerUrl: string, contractAddress: string) {
    this.provider = new ethers.WebSocketProvider(providerUrl);
    this.contract = new ethers.Contract(contractAddress, ERC721_ABI, this.provider);
    this.sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
  }

  async sendMessageToSQS(messageData: TransferEvent) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(messageData),
      });

      const result = await this.sqsClient.send(command);
      console.log('Message sent:', result.MessageId);
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async startListening(contractAddress: string): Promise<void> {
    console.log(`Listening for Transfer events on contract: ${contractAddress}`);

    this.contract.on('Transfer', (from: string, to: string, tokenId: bigint, event: any) => {
      const transferData: TransferEvent = {
        from,
        to,
        tokenId: tokenId.toString(),
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      };

      this.handleTransfer(transferData);
    });

    this.provider.on('error', (error) => {
      console.error('Provider error:', error);
    });

    console.log('Transfer listener started successfully');
  }

  stopListening(): void {
    this.contract.removeAllListeners('Transfer');
    this.provider.removeAllListeners();

    console.log('Transfer listener stopped');
  }

  private async handleTransfer(transfer: TransferEvent) {
    let type = 'TRANSFER';

    if (transfer.from === '0x0000000000000000000000000000000000000000') {
      type = 'MINT';

      console.log('[MINT-1]');
    } else if (transfer.to === '0x0000000000000000000000000000000000000000') {
      type = 'BURN';

      console.log('[BURN-1]');
    }

    console.log(`[SUCCESS-1] Transfer Transaction Type ${type}: ${JSON.stringify(transfer)}`);

    await this.sendMessageToSQS(transfer);
  }
}

async function main() {
  if (!INFURA_URL || !CONTRACT_ADDRESS) {
    console.error('ERROR: Please set INFURA_URL and CONTRACT_ADDRESS in the environment variables.');
    
    process.exit(1);
  }

  const listener = new ERC721TransferListener(INFURA_URL, CONTRACT_ADDRESS);

  try {
    await listener.startListening(CONTRACT_ADDRESS);

    process.on('SIGINT', () => {
      console.log('Shutting down...');

      listener.stopListening();

      process.exit(0);
    });

  } catch (error) {
    console.error('ERROR:', error);

    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ERC721TransferListener };