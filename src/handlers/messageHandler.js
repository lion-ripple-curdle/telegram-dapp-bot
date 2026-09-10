const { getUser, updateUser } = require('../database/userModel');
const { getSubscriptionPlans } = require('../database/planModel');
const { generatePaymentInvoice } = require('../blockchain/tonPayment');

async function handleTelegramMessage(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  // Ensure user exists in database
  await getUser(userId) || await createNewUser(userId, msg.from);

  try {
    if (text === '/start') {
      await handleStart(bot, chatId, userId);
    } else if (text === '/buy') {
      await handleBuyVpn(bot, chatId, userId);
    } else if (text === '/status') {
      await handleStatus(bot, chatId, userId);
    } else if (text === '/wallet') {
      await handleWallet(bot, chatId, userId);
    } else if (text === '/help') {
      await handleHelp(bot, chatId);
    } else if (text === '/admin') {
      await handleAdmin(bot, chatId, userId);
    } else {
      bot.sendMessage(chatId, '❓ Unknown command. Type /help for available commands.');
    }
  } catch (error) {
    console.error('Error handling message:', error);
    bot.sendMessage(chatId, '❌ An error occurred. Please try again later.');
  }
}

async function handleStart(bot, chatId, userId) {
  const welcomeMessage = `
🤖 Welcome to VPN Bot!

This bot allows you to purchase VPN subscriptions using TON coins directly from your wallet.

📋 Quick Start:
• /buy - Purchase a VPN subscription
• /status - Check your current subscription
• /wallet - Connect your TON wallet
• /help - Show all available commands

Let's get started! 🚀
  `;
  
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 Buy VPN', callback_data: 'buy_vpn' }],
        [{ text: '📊 My Subscription', callback_data: 'check_status' }],
        [{ text: '💼 Wallet', callback_data: 'connect_wallet' }],
        [{ text: '❓ Help', callback_data: 'show_help' }]
      ]
    }
  };
  
  bot.sendMessage(chatId, welcomeMessage, opts);
}

async function handleBuyVpn(bot, chatId, userId) {
  const plans = await getSubscriptionPlans();
  
  const message = '🛒 Select a VPN subscription plan:\n\n';
  
  const opts = {
    reply_markup: {
      inline_keyboard: plans.map(plan => [
        { text: `${plan.name} - ${plan.price} TON/month`, callback_data: `select_plan_${plan.id}` }
      ])
    }
  };
  
  bot.sendMessage(chatId, message + plans.map(p => 
    `📦 ${p.name}\n   Price: ${p.price} TON/month\n   Features: ${p.features}\n`
  ).join('\n'), opts);
}

async function handleStatus(bot, chatId, userId) {
  const user = await getUser(userId);
  
  if (!user.subscription || user.subscription.status === 'inactive') {
    bot.sendMessage(
      chatId,
      '❌ You don\'t have an active subscription.\n\nType /buy to purchase one!'
    );
    return;
  }
  
  const message = `
✅ Subscription Status

📋 Plan: ${user.subscription.plan}
💰 Price: ${user.subscription.price} TON/month
🕐 Expires: ${new Date(user.subscription.expiresAt).toLocaleDateString()}
🌍 Server: ${user.subscription.server}
🔑 Username: ${user.subscription.username}

VPN Credentials:
\`\`\`
Protocol: WireGuard/OpenVPN
Server: ${user.subscription.server}
User: ${user.subscription.username}
Password: [Check secure message]
\`\`\`
  `;
  
  bot.sendMessage(chatId, message);
}

async function handleWallet(bot, chatId, userId) {
  const message = `
💼 TON Wallet Connection

To purchase VPN subscriptions with TON coins, you need to connect your wallet.

Steps:
1. Use @tonkeeper_bot to create a TON wallet (if you don't have one)
2. Send your wallet address below
3. We'll verify your wallet

Your wallet address:
  `;
  
  bot.sendMessage(chatId, message);
  bot.on('message', async (msg) => {
    if (msg.chat.id === chatId && msg.text.startsWith('E') || msg.text.startsWith('0')) {
      const address = msg.text;
      await updateUser(userId, { walletAddress: address, walletVerified: true });
      bot.sendMessage(chatId, `✅ Wallet connected: ${address.slice(0, 20)}...\n\nYou can now purchase VPN!`);
    }
  });
}

async function handleHelp(bot, chatId) {
  const helpMessage = `
❓ Available Commands

/start - Show welcome message
/buy - Purchase VPN subscription
/status - Check your subscription
/wallet - Connect TON wallet
/help - Show this message
/admin - Admin panel (admin only)

💡 How to Buy:
1. Click /buy to see available plans
2. Select a plan
3. Complete payment with TON coins
4. Get VPN credentials instantly

🔐 Security:
• All payments are verified on blockchain
• Your credentials are stored securely
• No credit card needed

📞 Support:
For issues, contact: @vpn_bot_support
  `;
  
  bot.sendMessage(chatId, helpMessage);
}

async function handleAdmin(bot, chatId, userId) {
  // Check if user is admin
  if (userId.toString() !== process.env.ADMIN_USER_ID) {
    bot.sendMessage(chatId, '❌ Access denied. You are not an admin.');
    return;
  }
  
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Statistics', callback_data: 'admin_stats' }],
        [{ text: '👥 Users', callback_data: 'admin_users' }],
        [{ text: '💳 Transactions', callback_data: 'admin_transactions' }],
        [{ text: '⚙️ Settings', callback_data: 'admin_settings' }]
      ]
    }
  };
  
  bot.sendMessage(chatId, '🔧 Admin Panel', opts);
}

async function createNewUser(userId, from) {
  // Create new user in database
  return {
    telegramId: userId,
    firstName: from.first_name,
    lastName: from.last_name || '',
    username: from.username || '',
    createdAt: new Date(),
    subscription: null
  };
}

module.exports = {
  handleTelegramMessage
};
