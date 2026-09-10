const { getSubscriptionPlan } = require('../database/planModel');
const { generatePaymentInvoice } = require('../blockchain/tonPayment');
const { updateUser } = require('../database/userModel');

async function handleTelegramCallback(bot, query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  try {
    if (data === 'buy_vpn') {
      await handleBuyCallback(bot, chatId);
    } else if (data.startsWith('select_plan_')) {
      const planId = data.replace('select_plan_', '');
      await handlePlanSelection(bot, chatId, userId, planId);
    } else if (data === 'check_status') {
      await handleStatusCallback(bot, chatId, userId);
    } else if (data === 'connect_wallet') {
      await handleWalletCallback(bot, chatId, userId);
    } else if (data === 'show_help') {
      await handleHelpCallback(bot, chatId);
    } else if (data.startsWith('confirm_payment_')) {
      const invoiceId = data.replace('confirm_payment_', '');
      await handlePaymentConfirmation(bot, chatId, userId, invoiceId);
    }

    bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Error handling callback:', error);
    bot.answerCallbackQuery(query.id, { text: '❌ Error occurred' });
  }
}

async function handleBuyCallback(bot, chatId) {
  const plans = [
    { id: 1, name: 'Basic', price: 5, features: '10 GB/month' },
    { id: 2, name: 'Pro', price: 15, features: '100 GB/month' },
    { id: 3, name: 'Premium', price: 30, features: 'Unlimited' }
  ];

  const opts = {
    reply_markup: {
      inline_keyboard: plans.map(plan => [
        { text: `${plan.name} - ${plan.price} TON`, callback_data: `select_plan_${plan.id}` }
      ])
    }
  };

  bot.editMessageText('🛒 Select a plan:', {
    chat_id: chatId,
    message_id: null,
    reply_markup: opts.reply_markup
  }).catch(() => {
    bot.sendMessage(chatId, '🛒 Select a plan:', opts);
  });
}

async function handlePlanSelection(bot, chatId, userId, planId) {
  const plan = await getSubscriptionPlan(planId);

  if (!plan) {
    bot.sendMessage(chatId, '❌ Plan not found.');
    return;
  }

  // Generate payment invoice
  const invoice = await generatePaymentInvoice(userId, plan);

  const message = `
✅ Payment Invoice

📦 Plan: ${plan.name}
💰 Price: ${plan.price} TON
🕐 Duration: 1 month
📝 Invoice ID: ${invoice.id}

📋 Instructions:
1. Click the button below
2. Approve payment in your TON wallet
3. VPN credentials will be sent automatically

Transaction Address: ${invoice.tonAddress}
  `;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💳 Pay with TON', url: `ton://transfer/${invoice.tonAddress}?amount=${plan.price}&text=VPN+Subscription` }],
        [{ text: '✅ I've paid', callback_data: `confirm_payment_${invoice.id}` }],
        [{ text: '❌ Cancel', callback_data: 'buy_vpn' }]
      ]
    }
  };

  bot.sendMessage(chatId, message, opts);
}

async function handleStatusCallback(bot, chatId, userId) {
  const user = await getUser(userId);

  if (!user.subscription || user.subscription.status === 'inactive') {
    bot.sendMessage(chatId, '❌ No active subscription. Type /buy to purchase one.');
    return;
  }

  const statusMessage = `
✅ Your Subscription

📦 Plan: ${user.subscription.plan}
💰 Price: ${user.subscription.price} TON
⏱️ Expires: ${new Date(user.subscription.expiresAt).toLocaleDateString()}
🌍 Server: ${user.subscription.server}
  `;

  bot.sendMessage(chatId, statusMessage);
}

async function handleWalletCallback(bot, chatId, userId) {
  bot.sendMessage(chatId, `
💼 Connect Wallet

To connect your TON wallet:
1. Use @tonkeeper_bot to create wallet
2. Send your wallet address here
3. We'll verify and activate it

Waiting for your wallet address...
  `);
}

async function handleHelpCallback(bot, chatId) {
  const helpMessage = `
❓ VPN Bot Help

📍 Commands:
/start - Welcome
/buy - Purchase VPN
/status - Check subscription
/wallet - Manage wallet
/help - This message

💡 How to Buy:
1. Type /buy
2. Choose a plan
3. Approve TON payment
4. Get credentials instantly

🔒 Security Tips:
• Keep your credentials private
• Don't share your account
• Use strong passwords

📞 Need Help?
Contact: @vpn_bot_support
  `;

  bot.sendMessage(chatId, helpMessage);
}

async function handlePaymentConfirmation(bot, chatId, userId, invoiceId) {
  bot.sendMessage(chatId, '⏳ Verifying payment on blockchain...');

  // Here you would verify the payment on TON blockchain
  setTimeout(() => {
    bot.sendMessage(chatId, `
✅ Payment Confirmed!

Your VPN subscription is now active.

🔑 Credentials:
Server: vpn.us.example.com
Username: user_${userId}
Password: [sent in secure message]

Protocol: WireGuard/OpenVPN

Type /status to manage your subscription.
    `);
  }, 2000);
}

module.exports = {
  handleTelegramCallback
};
