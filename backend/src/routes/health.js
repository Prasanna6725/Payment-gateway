const express = require('express');
const { pool, authenticateMerchant, checkDatabaseConnection } = require('../database');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    
    res.status(200).json({
      status: 'healthy',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/api/v1/test/merchant', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, api_key FROM merchants WHERE email = $1',
      ['test@example.com']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Test merchant not found'
        }
      });
    }
    
    const merchant = result.rows[0];
    res.status(200).json({
      id: merchant.id,
      email: merchant.email,
      api_key: merchant.api_key,
      seeded: true
    });
  } catch (error) {
    console.error('Error fetching test merchant:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

module.exports = router;
