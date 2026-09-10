const { TonClient, WalletContractV4, internal, external } = require('@ton/ton');
const { mnemonicToWalletKey } = require('@ton/crypto');
const { v4: uuidv4 } = require('uuid');
const { pgConnection } = require('../database');

// Initialize TON client
const tonClient = new TonClient({
  endpoint: process.env.TON_API_URL || 'https://toncenter.com/api/v2/jsonRPC'
});

async function generatePaymentInvoice(userId, plan) {
  try {
    const invoiceId = uuidv4();
    const tonAddress = process.env.TON_WALLET_ADDRESS;

    // Store invoice in database
    await pgConnection.query(
      `INSERT INTO payment_invoices (user_id, plan_id, ton_address, amount, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        plan.id,
        tonAddress,
        plan.price,
        'pending',
        new Date(Date.now() + 15 * 60 * 1000) // 15 minutes expiry
      ]
    );

    return {
      id: invoiceId,
      tonAddress: tonAddress,
      amount: plan.price,
      plan: plan
    };
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}

async function verifyPayment(transactionHash, expectedAmount) {
  try {
    // Get transaction from TON blockchain
    const transactions = await tonClient.getTransactions(
      process.env.TON_WALLET_ADDRESS,
      100
    );

    for (const tx of transactions) {
      if (tx.hash === transactionHash) {
        // Verify amount
        const amount = tx.inMessage?.body?.parsed?.jettonAmount || tx.inMessage?.value;
        if (Math.abs(amount - expectedAmount) < 0.001) {
          return {
            verified: true,
            transactionHash: transactionHash,
            amount: amount,
            timestamp: new Date(tx.utime * 1000)
          };
        }
      }
    }

    return { verified: false };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { verified: false };
  }
}

async function createWalletFromMnemonic() {
  try {
    const mnemonic = process.env.TON_MNEMONIC.split(' ');
    const key = await mnemonicToWalletKey(mnemonic);

    const wallet = WalletContractV4.create({
      publicKey: key.publicKey,
      workchain: 0
    });

    return {
      contract: wallet,
      publicKey: key.publicKey,
      address: wallet.address
    };
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
}

async function sendVpnCredentials(transactionHash, userId, plan) {
  try {
    const credentials = {
      username: `vpn_user_${userId}_${Date.now()}`,
      password: generateSecurePassword(32),
      server: await selectOptimalServer(),
      protocol: 'WireGuard',
      expiresAt: new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000)
    };

    // Store subscription in database
    const userResult = await pgConnection.query(
      'SELECT id FROM users WHERE telegram_id = $1',
      [userId]
    );

    const dbUserId = userResult.rows[0].id;

    await pgConnection.query(
      `INSERT INTO subscriptions (user_id, plan_id, username, password, server, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        dbUserId,
        plan.id,
        credentials.username,
        credentials.password,
        credentials.server,
        credentials.expiresAt,
        'active'
      ]
    );

    // Log transaction
    await pgConnection.query(
      `INSERT INTO transactions (user_id, amount, currency, tx_hash, status, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [dbUserId, plan.price, 'TON', transactionHash, 'confirmed']
    );

    return credentials;
  } catch (error) {
    console.error('Error sending credentials:', error);
    throw error;
  }
}

function generateSecurePassword(length = 32) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return password;
}

async function selectOptimalServer() {
  const servers = ['us.vpn.example.com', 'eu.vpn.example.com', 'asia.vpn.example.com'];
  return servers[Math.floor(Math.random() * servers.length)];
}

async function monitorPayment(invoiceId, userId, maxWaitTime = 900000) {
  // Poll for payment confirmation for up to 15 minutes
  const startTime = Date.now();
  const pollInterval = 10000; // Check every 10 seconds

  return new Promise((resolve, reject) => {
    const pollHandle = setInterval(async () => {
      try {
        const invoice = await pgConnection.query(
          'SELECT * FROM payment_invoices WHERE id = $1',
          [invoiceId]
        );

        if (invoice.rows.length > 0 && invoice.rows[0].status === 'confirmed') {
          clearInterval(pollHandle);
          resolve(invoice.rows[0]);
        }

        if (Date.now() - startTime > maxWaitTime) {
          clearInterval(pollHandle);
          reject(new Error('Payment timeout'));
        }
      } catch (error) {
        console.error('Error monitoring payment:', error);
      }
    }, pollInterval);
  });
}

module.exports = {
  generatePaymentInvoice,
  verifyPayment,
  createWalletFromMnemonic,
  sendVpnCredentials,
  generateSecurePassword,
  selectOptimalServer,
  monitorPayment,
  tonClient
};
