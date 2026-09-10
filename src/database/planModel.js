const { pgConnection } = require('./index');

const DEFAULT_PLANS = [
  {
    id: 1,
    name: 'Basic',
    price: 5.00,
    features: '10 GB/month, 5 server locations',
    duration_days: 30
  },
  {
    id: 2,
    name: 'Pro',
    price: 15.00,
    features: '100 GB/month, 20 server locations, No ads',
    duration_days: 30
  },
  {
    id: 3,
    name: 'Premium',
    price: 30.00,
    features: 'Unlimited data, 50+ server locations, Priority support',
    duration_days: 30
  }
];

async function initializePlans() {
  try {
    for (const plan of DEFAULT_PLANS) {
      const exists = await pgConnection.query(
        'SELECT * FROM plans WHERE id = $1',
        [plan.id]
      );

      if (exists.rows.length === 0) {
        await pgConnection.query(
          `INSERT INTO plans (id, name, price, features, duration_days)
           VALUES ($1, $2, $3, $4, $5)`,
          [plan.id, plan.name, plan.price, plan.features, plan.duration_days]
        );
      }
    }
    console.log('✅ Plans initialized');
  } catch (error) {
    console.error('Error initializing plans:', error);
  }
}

async function getSubscriptionPlans() {
  try {
    const result = await pgConnection.query('SELECT * FROM plans ORDER BY price ASC');
    return result.rows;
  } catch (error) {
    console.error('Error getting plans:', error);
    return DEFAULT_PLANS;
  }
}

async function getSubscriptionPlan(planId) {
  try {
    const result = await pgConnection.query(
      'SELECT * FROM plans WHERE id = $1',
      [planId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting plan:', error);
    return null;
  }
}

module.exports = {
  initializePlans,
  getSubscriptionPlans,
  getSubscriptionPlan
};
