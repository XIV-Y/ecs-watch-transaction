# NFT Blockchain Monitoring System

EthereumブロックチェーンのNFTコントラクトを監視し、Transfer/Mint/Burnイベントを検知してSlack通知とEmail通知を行うシステムです。

## システム構成

```
Ethereum Network → ECS (Transaction Monitor) → SQS → Lambda → SES/SNS → Slack/Email
```

<img width="1281" height="622" alt="スクリーンショット (331)" src="https://github.com/user-attachments/assets/719c916b-bce7-47a2-9319-a2841723481a" />


### 主要コンポーネント

- **Smart Contract**: ERC721準拠のNFTコントラクト
- **Transaction Monitor**: ECS Fargateで動作するイベント監視アプリケーション
- **SQS**: メッセージキューイング
- **Lambda**: SQSメッセージを処理してメール送信
- **CloudWatch**: ログ監視とアラート
- **Slack/Email**: 通知システム

## 前提条件

### 必要なツール
- Node.js
- AWS CLI
- AWS CDK
- Docker
- Hardhat

### 必要なアカウント・サービス
- AWSアカウント
- Infura アカウント (Ethereum ノードアクセス用)
- Slackワークスペース (通知用)
- AWS SES設定 (メール送信用)

## 環境構築

### 1. プロジェクトのクローン

```bash
git clone <repository-url>
cd nft-blockchain-monitoring
```

### 2. 各ディレクトリでの依存関係インストール

```bash
# AWS CDK
cd aws
npm install

# Hardhat (コントラクト)
cd ../contract
npm install

# Transaction Monitor
cd ../watch-transaction
npm install
```

### 3. 環境変数の設定

#### AWS設定ファイル (`aws/.env`)
```bash
cp aws/.env.example aws/.env
```

```env
INFURA_URL=
CONTRACT_ADDRESS=
SLACK_WORKSPACE_ID=
SLACK_CHANNEL_ID=
SLACK_ALERT_CHANNEL_ID=
FROM_EMAIL_ADDRESS=
TO_EMAIL_ADDRESS=
QUEUE_URL=
```

#### コントラクト設定ファイル (`contract/.env`)
```bash
cp contract/.env.example contract/.env
```

```env
SEPOLIA_RPC_URL=
PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

#### Transaction Monitor設定ファイル (`watch-transaction/.env`)
```bash
cp watch-transaction/.env.example watch-transaction/.env
```

```env
INFURA_URL=
CONTRACT_ADDRESS=
QUEUE_URL=
```

## デプロイ手順

### 1. Smart Contractのデプロイ

```bash
cd contract

# Sepoliaテストネットにデプロイ
npx hardhat ignition deploy ./ignition/modules/NFT.ts --network sepolia

# デプロイされたコントラクトアドレスをメモ
```

### 2. AWSインフラのデプロイ

```bash
cd aws

npx cdk deploy WatchTransactionECRStack
npx cdk deploy LambdaSqsStack  
npx cdk deploy WatchTransactionStack
npx cdk deploy EcsMonitoringStack
npx cdk deploy LogsAlertStack
```

### 3. Dockerイメージのビルドとプッシュ

```bash
cd watch-transaction

# ECRにログイン
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com

# イメージをビルド
docker build -t watch-transaction .

# タグ付け
docker tag watch-transaction:latest <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/watch-transaction:latest

# プッシュ
docker push <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com/watch-transaction:latest
```

### 4. ECSサービスの更新

## 動作確認

### 1. NFTのMint

```bash
cd contract

# scripts/mint.tsのCONTRAC_ADDRESS、TO_ADDRESS、TOKEN_URIを設定
# その後実行
npx hardhat run scripts/mint.ts --network sepolia
```

### 2. ログの確認

```bash
# ECSタスクのログを確認
aws logs tail /ecs/watch-transaction --follow

# Lambdaのログを確認  
aws logs tail /aws/lambda/LambdaSqsStack-EmailProcessor --follow
```

### 3. 通知の確認

- Slackチャンネルに通知が届くことを確認
- 指定したメールアドレスに通知メールが届くことを確認

## 監視とアラート

### CloudWatchアラーム

1. **ログ監視**: "MINT-1"文字列がログに出現した場合にSlack通知
