require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { initializeDatabase } = require('./database');
const { handleTelegramMessage } = require('./handlers/messageHandler');
const { handleTelegramCallback } = require('./handlers/callbackHandler');
const { startPaymentListener } = require('./blockchain/paymentListener');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();

app.use(express.json());

// Initialize database
initializeDatabase();

// Start payment listener for TON transactions
startPaymentListener(bot);

// Handle incoming messages
bot.on('message', (msg) => {
  handleTelegramMessage(bot, msg);
});

// Handle callback queries (inline buttons)
bot.on('callback_query', (query) => {
  handleTelegramCallback(bot, query);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Webhook for TON payment notifications
app.post('/webhook/payment', (req, res) => {
  const { transactionHash, userTelegramId, amount } = req.body;
  
  bot.sendMessage(userTelegramId, `✅ Payment confirmed!\n\nAmount: ${amount} TON\nTransaction: ${transactionHash}`);
  res.json({ status: 'received' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VPN Bot server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  bot.stopPolling();
  process.exit(0);
});
