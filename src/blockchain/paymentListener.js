const { tonClient } = require('./tonPayment');
const { pgConnection } = require('../database');
const { sendVpnCredentials } = require('./tonPayment');

let lastSeenLt = null;
let paymentListenerActive = false;

async function startPaymentListener(bot) {
  if (paymentListenerActive) return;
  
  paymentListenerActive = true;
  console.log('🔍 Payment listener started');

  // Poll every 30 seconds
  setInterval(() => checkForPayments(bot), 30000);
}

async function checkForPayments(bot) {
  try {
    const walletAddress = process.env.TON_WALLET_ADDRESS;

    // Get recent transactions
    const transactions = await tonClient.getTransactions(walletAddress, 10);

    for (const tx of transactions) {
      // Skip if we've already processed this
      if (lastSeenLt && tx.lt <= lastSeenLt) continue;

      lastSeenLt = tx.lt;

      // Check if this is an incoming transaction
      if (tx.inMessage && tx.inMessage.source) {
        const amount = tx.inMessage.value;
        const senderAddress = tx.inMessage.source;

        // Get comment/text from transaction
        const comment = tx.inMessage.body?.text || '';

        // Try to match with pending invoice
        const invoice = await findMatchingInvoice(amount, comment);

        if (invoice) {
          // Process payment
          await processPayment(bot, invoice, tx.hash, amount);
        }
      }
    }
  } catch (error) {
    console.error('Error checking payments:', error);
  }
}

async function findMatchingInvoice(amount, comment) {
  try {
    // First try exact amount match
    let result = await pgConnection.query(
      `SELECT * FROM payment_invoices 
       WHERE amount = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [amount]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // If comment contains invoice ID, try that
    if (comment) {
      result = await pgConnection.query(
        `SELECT * FROM payment_invoices 
         WHERE id = $1 AND status = 'pending'`,
        [comment]
      );

      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding invoice:', error);
    return null;
  }
}

async function processPayment(bot, invoice, transactionHash, amount) {
  try {
    // Update invoice status
    await pgConnection.query(
      `UPDATE payment_invoices 
       SET status = 'confirmed'
       WHERE id = $1`,
      [invoice.id]
    );

    // Get user telegram ID
    const userResult = await pgConnection.query(
      'SELECT telegram_id FROM users WHERE id = $1',
      [invoice.user_id]
    );

    if (userResult.rows.length === 0) {
      console.error('User not found for invoice:', invoice.id);
      return;
    }

    const telegramId = userResult.rows[0].telegram_id;

    // Get plan info
    const planResult = await pgConnection.query(
      'SELECT * FROM plans WHERE id = $1',
      [invoice.plan_id]
    );

    const plan = planResult.rows[0];

    // Send VPN credentials
    const credentials = await sendVpnCredentials(
      transactionHash,
      invoice.user_id,
      plan
    );

    // Notify user
    const message = `
✅ Payment Confirmed!

📦 Plan: ${plan.name}
💰 Amount: ${amount} TON
🕐 Duration: ${plan.duration_days} days
⏰ Expires: ${new Date(credentials.expiresAt).toLocaleDateString()}

🔑 Your VPN Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━
Protocol: ${credentials.protocol}
Server: ${credentials.server}
Username: ${credentials.username}
Password: \`${credentials.password}\`
━━━━━━━━━━━━━━━━━━━━━━━━━

📲 Setup Guide:
1. Download WireGuard app
2. Add new tunnel with credentials above
3. Connect to VPN
4. Enjoy secure browsing!

🆘 Support: @vpn_bot_support
    `;

    await bot.sendMessage(telegramId, message);

    // Send credentials in a separate secure message
    const credentialsSecure = `
🔐 Secure Credentials Record

Save this message for your records:

Server: ${credentials.server}
Username: ${credentials.username}
Password: ${credentials.password}
Protocol: ${credentials.protocol}
Expires: ${new Date(credentials.expiresAt).toLocaleString()}
    `;

    await bot.sendMessage(telegramId, credentialsSecure);

    console.log(`✅ Payment processed for user ${telegramId}, invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error processing payment:', error);
  }
}

module.exports = {
  startPaymentListener,
  checkForPayments
};
