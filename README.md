# VPN Telegram Bot with TON Payment

A Telegram bot that provides VPN services with payments in TON blockchain coins. Users can purchase VPN subscriptions directly through Telegram using their TON wallets.

## Features

- 🤖 Telegram bot interface for easy access
- 💰 TON blockchain payment integration
- 🔐 VPN service provisioning
- 📊 Subscription management
- 🔑 Wallet authentication via TON
- ⚙️ Admin dashboard
- 📱 User-friendly commands

## Tech Stack

- **Language**: Node.js / Python
- **Telegram API**: pyTelegramBotAPI / python-telegram-bot
- **Blockchain**: TON SDK
- **Database**: PostgreSQL / MongoDB
- **Payment**: TON Wallet API
- **Server**: Express.js / Flask

## Prerequisites

- Node.js or Python 3.8+
- Telegram Bot Token
- TON Wallet
- TON SDK
- Database instance (PostgreSQL/MongoDB)

## Installation

1. Clone this repository
2. Install dependencies
3. Configure environment variables
4. Set up database
5. Deploy bot

## Configuration

See `.env.example` for required environment variables.

## Usage

Start the bot and interact with it on Telegram:

```
/start - Begin using the bot
/buy - Purchase VPN subscription
/status - Check subscription status
/wallet - Connect TON wallet
/help - Display help information
```

## TON Payment Flow

1. User selects VPN subscription plan
2. Bot generates payment invoice
3. User approves payment in TON wallet
4. Transaction confirmed on blockchain
5. VPN credentials provisioned automatically

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.
