# VPN Telegram Bot - Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- MongoDB (optional)
- TON Wallet with testnet/mainnet coins
- Telegram Bot Token
- Docker & Docker Compose (optional)

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/lion-ripple-curdle/telegram-dapp-bot.git
cd telegram-dapp-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Telegram Bot Token
- TON network settings
- Database credentials
- VPN service API keys

### 4. Start Local Services (Docker)
```bash
docker-compose up -d
```

### 5. Initialize Database
```bash
npm run db:migrate
```

### 6. Start Bot
```bash
npm run dev
```

## Docker Deployment

### Build Docker Image
```bash
docker build -t vpn-telegram-bot:latest .
```

### Run Container
```bash
docker run -d \
  --name vpn-bot \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e TON_API_URL=https://toncenter.com/api/v2 \
  -e DATABASE_URL=postgresql://user:pass@db:5432/vpn_bot \
  -p 3000:3000 \
  vpn-telegram-bot:latest
```

## Production Deployment

### Option 1: VPS (Ubuntu/Debian)

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Clone and setup
git clone https://github.com/lion-ripple-curdle/telegram-dapp-bot.git
cd telegram-dapp-bot
npm install --production

# Create systemd service
sudo nano /etc/systemd/system/vpn-bot.service
```

### Systemd Service File
```ini
[Unit]
Description=VPN Telegram Bot
After=network.target

[Service]
Type=simple
User=vpn-bot
WorkingDirectory=/home/vpn-bot/telegram-dapp-bot
ExecStart=/usr/bin/node /home/vpn-bot/telegram-dapp-bot/src/index.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
EnvironmentFile=/home/vpn-bot/.env

[Install]
WantedBy=multi-user.target
```

### Enable Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable vpn-bot
sudo systemctl start vpn-bot
```

### Option 2: Railway, Heroku, or Similar

1. Connect your GitHub repository
2. Set environment variables in platform dashboard
3. Deploy automatically on push

### Option 3: Kubernetes

```bash
# Create ConfigMap for environment
kubectl create configmap vpn-bot-config --from-env-file=.env

# Deploy
kubectl apply -f k8s/deployment.yaml
```

## TON Network Setup

### 1. Create TON Wallet
- Use @tonkeeper_bot on Telegram
- Or visit https://tonkeeper.com/

### 2. Get Testnet Tokens
- Visit https://testnet.toncenter.com/

### 3. Update .env
```
TON_WALLET_ADDRESS=your_wallet_address
TON_MNEMONIC=word1 word2 word3 ... word24
TON_NETWORK=mainnet  # or testnet
```

## Database Migration

### PostgreSQL Setup
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vpn_bot;
CREATE USER vpn_bot WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE vpn_bot TO vpn_bot;

# Exit psql
\q
```

### Run Migrations
```bash
npm run db:migrate
npm run db:seed
```

## Monitoring & Logs

### Check Bot Status
```bash
systemctl status vpn-bot
```

### View Logs
```bash
journalctl -u vpn-bot -f
# or
tail -f /var/log/vpn-bot/bot.log
```

### Monitor Performance
```bash
npm install -g pm2
pm2 start src/index.js --name "vpn-bot"
pm2 monit
```

## Scaling

### Load Balancing
- Use Nginx as reverse proxy
- Configure SSL/TLS
- Set up multiple bot instances

### Database Optimization
- Enable connection pooling
- Set up read replicas
- Configure caching with Redis

## Security

### SSL/TLS Encryption
```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### Firewall Rules
```bash
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

### Backup Strategy
```bash
# PostgreSQL backup
pg_dump vpn_bot > backup_$(date +%Y%m%d).sql

# Automated daily backup
0 2 * * * pg_dump vpn_bot > /backups/backup_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Bot Not Responding
- Check Telegram Bot Token
- Verify webhook URL configuration
- Check network connectivity to Telegram API

### Payment Not Processing
- Verify TON wallet address
- Check TON API endpoint
- Inspect transaction hash on blockchain

### Database Connection Error
- Verify DATABASE_URL
- Check PostgreSQL service status
- Confirm credentials

## Health Checks

### API Endpoint
```bash
curl http://localhost:3000/health
```

### Bot Commands
- Send `/start` to bot
- Verify responses

## Support

For issues:
1. Check logs
2. Review error messages
3. Open GitHub issue with details
4. Contact: @vpn_bot_support on Telegram

## Additional Resources

- [TON Documentation](https://ton.org/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides)
