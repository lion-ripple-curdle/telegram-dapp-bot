const { pgConnection } = require('./index');

async function getUser(telegramId) {
  try {
    const result = await pgConnection.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

async function createUser(telegramId, firstName, lastName, username) {
  try {
    const result = await pgConnection.query(
      `INSERT INTO users (telegram_id, first_name, last_name, username)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [telegramId, firstName, lastName, username]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

async function updateUser(telegramId, updates) {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(telegramId);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = $${paramCount}
      RETURNING *
    `;

    const result = await pgConnection.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

async function getUserSubscription(telegramId) {
  try {
    const result = await pgConnection.query(
      `SELECT s.*, p.name, p.price 
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       JOIN plans p ON s.plan_id = p.id
       WHERE u.telegram_id = $1 AND s.status = 'active'
       ORDER BY s.expires_at DESC
       LIMIT 1`,
      [telegramId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
}

module.exports = {
  getUser,
  createUser,
  updateUser,
  getUserSubscription
};
