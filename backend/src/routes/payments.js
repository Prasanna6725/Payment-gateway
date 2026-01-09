const express = require('express');
const { pool, authenticateMerchant } = require('../database');
const { 
  generatePaymentId, 
  validateVPA, 
  validateCardNumber, 
  detectCardNetwork, 
  validateExpiry,
  getProcessingDelay,
  determinePaymentSuccess
} = require('../utils');

const router = express.Router();

async function processPaymentAsync(paymentId, method, delay, cardNumber = null, vpa = null) {
  setTimeout(async () => {
    try {
      const isSuccess = determinePaymentSuccess(method, cardNumber, vpa);
      
      if (isSuccess) {
        await pool.query(
          'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['success', paymentId]
        );
      } else {
        let errorCode = 'PAYMENT_FAILED';
        let errorDescription = 'Payment processing failed';
        
        if (method === 'upi') {
          errorCode = 'PAYMENT_FAILED';
          errorDescription = 'UPI payment failed';
        } else if (method === 'card') {
          errorCode = 'PAYMENT_FAILED';
          errorDescription = 'Card payment failed';
        }
        
        await pool.query(
          'UPDATE payments SET status = $1, error_code = $2, error_description = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
          ['failed', errorCode, errorDescription, paymentId]
        );
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    }
  }, delay);
}

router.post('/api/v1/payments', async (req, res) => {
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
    
    const { order_id, method, vpa, card } = req.body;
    
    if (!order_id) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'order_id is required'
        }
      });
    }
    
    if (!method) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'method is required'
        }
      });
    }
    
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND merchant_id = $2',
      [order_id, merchant.id]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }
    
    const order = orderResult.rows[0];
    
    let cardNetwork = null;
    let cardLast4 = null;
    let errorMsg = null;
    
    if (method === 'upi') {
      if (!vpa) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'vpa is required for UPI payments'
          }
        });
      }
      
      if (!validateVPA(vpa)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VPA',
            description: 'Invalid VPA format'
          }
        });
      }
    } else if (method === 'card') {
      if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'card object must contain number, expiry_month, expiry_year, cvv, and holder_name'
          }
        });
      }
      
      if (!validateCardNumber(card.number)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CARD',
            description: 'Invalid card number'
          }
        });
      }
      
      if (!validateExpiry(card.expiry_month, card.expiry_year)) {
        return res.status(400).json({
          error: {
            code: 'EXPIRED_CARD',
            description: 'Card expiry date is invalid or in the past'
          }
        });
      }
      
      cardNetwork = detectCardNetwork(card.number);
      cardLast4 = card.number.slice(-4);
    } else {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Invalid payment method'
        }
      });
    }
    
    const paymentId = generatePaymentId();
    
    const paymentResult = await pool.query(
      `INSERT INTO payments 
       (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        paymentId,
        order.id,
        merchant.id,
        order.amount,
        order.currency,
        method,
        'processing',
        method === 'upi' ? vpa : null,
        method === 'card' ? cardNetwork : null,
        method === 'card' ? cardLast4 : null
      ]
    );
    
    const payment = paymentResult.rows[0];
    
    const delay = getProcessingDelay();
    processPaymentAsync(paymentId, method, delay, method === 'card' ? card.number : null, method === 'upi' ? vpa : null);
    
    const responseData = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString()
    };
    
    if (method === 'upi' && payment.vpa) {
      responseData.vpa = payment.vpa;
    }
    
    if (method === 'card') {
      responseData.card_network = payment.card_network;
      responseData.card_last4 = payment.card_last4;
    }
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

router.get('/api/v1/payments', async (req, res) => {
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
      'SELECT id, order_id, amount, currency, method, status, vpa, card_network, card_last4, error_code, error_description, created_at, updated_at FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC',
      [merchant.id]
    );

    const payments = result.rows.map(payment => {
      const responseData = {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        created_at: payment.created_at.toISOString(),
        updated_at: payment.updated_at.toISOString()
      };

      if (payment.vpa) {
        responseData.vpa = payment.vpa;
      }

      if (payment.card_network) {
        responseData.card_network = payment.card_network;
        responseData.card_last4 = payment.card_last4;
      }

      if (payment.error_code) {
        responseData.error_code = payment.error_code;
        responseData.error_description = payment.error_description;
      }

      return responseData;
    });

    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

router.get('/api/v1/payments/:paymentId', async (req, res) => {
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
      'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
      [req.params.paymentId, merchant.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found'
        }
      });
    }
    
    const payment = result.rows[0];
    
    const responseData = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString(),
      updated_at: payment.updated_at.toISOString()
    };
    
    if (payment.vpa) {
      responseData.vpa = payment.vpa;
    }
    
    if (payment.card_network) {
      responseData.card_network = payment.card_network;
      responseData.card_last4 = payment.card_last4;
    }
    
    if (payment.error_code) {
      responseData.error_code = payment.error_code;
      responseData.error_description = payment.error_description;
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

router.post('/api/v1/payments/public', async (req, res) => {
  try {
    const { order_id, method, vpa, card } = req.body;
    
    if (!order_id) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'order_id is required'
        }
      });
    }
    
    if (!method) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'method is required'
        }
      });
    }
    
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [order_id]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }
    
    const order = orderResult.rows[0];
    
    let cardNetwork = null;
    let cardLast4 = null;
    
    if (method === 'upi') {
      if (!vpa) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'vpa is required for UPI payments'
          }
        });
      }
      
      if (!validateVPA(vpa)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VPA',
            description: 'Invalid VPA format'
          }
        });
      }
    } else if (method === 'card') {
      if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'card object must contain number, expiry_month, expiry_year, cvv, and holder_name'
          }
        });
      }
      
      if (!validateCardNumber(card.number)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CARD',
            description: 'Invalid card number'
          }
        });
      }
      
      if (!validateExpiry(card.expiry_month, card.expiry_year)) {
        return res.status(400).json({
          error: {
            code: 'EXPIRED_CARD',
            description: 'Card expiry date is invalid or in the past'
          }
        });
      }
      
      cardNetwork = detectCardNetwork(card.number);
      cardLast4 = card.number.slice(-4);
    } else {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Invalid payment method'
        }
      });
    }
    
    const paymentId = generatePaymentId();
    
    const paymentResult = await pool.query(
      `INSERT INTO payments 
       (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        paymentId,
        order.id,
        order.merchant_id,
        order.amount,
        order.currency,
        method,
        'processing',
        method === 'upi' ? vpa : null,
        method === 'card' ? cardNetwork : null,
        method === 'card' ? cardLast4 : null
      ]
    );
    
    const payment = paymentResult.rows[0];
    
    const delay = getProcessingDelay();
    processPaymentAsync(paymentId, method, delay, method === 'card' ? card.number : null, method === 'upi' ? vpa : null);
    
    const responseData = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString()
    };
    
    if (method === 'upi' && payment.vpa) {
      responseData.vpa = payment.vpa;
    }
    
    if (method === 'card') {
      responseData.card_network = payment.card_network;
      responseData.card_last4 = payment.card_last4;
    }
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('Error creating public payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

router.get('/api/v1/payments/:paymentId/public', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, order_id, amount, currency, method, status, vpa, card_network, card_last4, error_code, error_description, created_at, updated_at FROM payments WHERE id = $1',
      [req.params.paymentId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found'
        }
      });
    }
    
    const payment = result.rows[0];
    
    const responseData = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString(),
      updated_at: payment.updated_at.toISOString()
    };
    
    if (payment.vpa) {
      responseData.vpa = payment.vpa;
    }
    
    if (payment.card_network) {
      responseData.card_network = payment.card_network;
      responseData.card_last4 = payment.card_last4;
    }
    
    if (payment.error_code) {
      responseData.error_code = payment.error_code;
      responseData.error_description = payment.error_description;
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    console.error('Error fetching public payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

module.exports = router;
