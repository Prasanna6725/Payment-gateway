const pool = require('./db');

async function authenticateMerchant(apiKey, apiSecret) {
  try {
    const result = await pool.query(
      'SELECT * FROM merchants WHERE api_key = $1 AND api_secret = $2 AND is_active = true',
      [apiKey, apiSecret]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

async function seedTestMerchant() {
  try {
    const existingMerchant = await pool.query(
      'SELECT * FROM merchants WHERE email = $1',
      [process.env.TEST_MERCHANT_EMAIL || 'test@example.com']
    );
    
    if (existingMerchant.rows.length === 0) {
      await pool.query(
        `INSERT INTO merchants (id, name, email, api_key, api_secret, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          '550e8400-e29b-41d4-a716-446655440000',
          'Test Merchant',
          process.env.TEST_MERCHANT_EMAIL || 'test@example.com',
          process.env.TEST_API_KEY || 'key_test_abc123',
          process.env.TEST_API_SECRET || 'secret_test_xyz789',
          true
        ]
      );
      console.log('Test merchant seeded successfully');
    } else {
      console.log('Test merchant already exists');
    }
  } catch (error) {
    console.error('Error seeding test merchant:', error);
  }
}

async function initializeDatabase() {
  try {
    const schema = require('fs').readFileSync(__dirname + '/schema.sql', 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized');
    
    await seedTestMerchant();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows[0] !== undefined;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

module.exports = {
  authenticateMerchant,
  seedTestMerchant,
  initializeDatabase,
  checkDatabaseConnection,
  pool
};
