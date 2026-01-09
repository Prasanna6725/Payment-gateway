const express = require('express');
const { pool, authenticateMerchant } = require('../database');
const { generateOrderId } = require('../utils');

const router = express.Router();

router.post('/api/v1/orders', async (req, res) => {
  try {
    const { 'x-api-key': apiKey, 'x-api-secret': apiSecret } = req.headers;
    
    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          description: 'Invalid API credentials'
        }
      });
    }
    
    const merchant = await authenticateMerchant(apiKey, apiSecret);
    if (!merchant) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          description: 'Invalid API credentials'
        }
      });
    }
    
    const { amount, currency = 'INR', receipt, notes } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount < 100) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'amount must be at least 100'
        }
      });
    }
    
    const orderId = generateOrderId();
    
    const result = await pool.query(
      `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [orderId, merchant.id, amount, currency, receipt || null, notes ? JSON.stringify(notes) : null, 'created']
    );
    
    const order = result.rows[0];
    
    res.status(201).json({
      id: order.id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes ? JSON.parse(order.notes) : {},
      status: order.status,
      created_at: order.created_at.toISOString()
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

router.get('/api/v1/orders/:orderId', async (req, res) => {
  try {
    const { 'x-api-key': apiKey, 'x-api-secret': apiSecret } = req.headers;
    
    if (!apiKey || !apiSecret) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          description: 'Invalid API credentials'
        }
      });
    }
    
    const merchant = await authenticateMerchant(apiKey, apiSecret);
    if (!merchant) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          description: 'Invalid API credentials'
        }
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND merchant_id = $2',
      [req.params.orderId, merchant.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }
    
    const order = result.rows[0];
    
    res.status(200).json({
      id: order.id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes ? JSON.parse(order.notes) : {},
      status: order.status,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString()
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

router.get('/api/v1/orders/:orderId/public', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, amount, currency, status FROM orders WHERE id = $1',
      [req.params.orderId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }
    
    const order = result.rows[0];
    
    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });
  } catch (error) {
    console.error('Error fetching public order:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

module.exports = router;
