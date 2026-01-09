import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Checkout.css';

export default function Checkout() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [upiData, setUpiData] = useState({ vpa: '' });
  const [cardData, setCardData] = useState({
    number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    holder_name: ''
  });
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    
    if (!orderId) {
      setLoading(false);
      return;
    }
    
    fetchOrder(orderId);
  }, []);

  useEffect(() => {
    if (!processing || !paymentResult) return;
    
    const timer = setTimeout(() => {
      checkPaymentStatus();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [paymentResult, processing, pollCount]);

  const fetchOrder = async (orderId) => {
    try {
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'http://api:8000';
      const response = await axios.get(`${baseUrl}/api/v1/orders/${orderId}/public`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentResult || !paymentResult.id) return;
    
    try {
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'http://api:8000';
      const response = await axios.get(`${baseUrl}/api/v1/payments/${paymentResult.id}/public`);
      const payment = response.data;
      
      if (payment.status === 'success' || payment.status === 'failed') {
        setPaymentResult(payment);
        setProcessing(false);
      } else {
        setPollCount(pollCount + 1);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPollCount(pollCount + 1);
    }
  };

  const handleUPISubmit = async (e) => {
    e.preventDefault();
    
    if (!upiData.vpa) {
      alert('Please enter VPA');
      return;
    }
    
    setProcessing(true);
    try {
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'http://api:8000';
      const response = await axios.post(`${baseUrl}/api/v1/payments/public`, {
        order_id: order.id,
        method: 'upi',
        vpa: upiData.vpa
      });
      
      setPaymentResult(response.data);
      setPollCount(0);
    } catch (error) {
      console.error('Error creating payment:', error);
      alert(error.response?.data?.error?.description || 'Payment failed');
      setProcessing(false);
    }
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    
    if (!cardData.number || !cardData.expiry_month || !cardData.expiry_year || !cardData.cvv || !cardData.holder_name) {
      alert('Please fill all card details');
      return;
    }
    
    setProcessing(true);
    try {
      const baseUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'http://api:8000';
      const response = await axios.post(`${baseUrl}/api/v1/payments/public`, {
        order_id: order.id,
        method: 'card',
        card: cardData
      });
      
      setPaymentResult(response.data);
      setPollCount(0);
    } catch (error) {
      console.error('Error creating payment:', error);
      alert(error.response?.data?.error?.description || 'Payment failed');
      setProcessing(false);
    }
  };

  const handleRetry = () => {
    setPaymentResult(null);
    setSelectedMethod(null);
    setUpiData({ vpa: '' });
    setCardData({ number: '', expiry_month: '', expiry_year: '', cvv: '', holder_name: '' });
  };

  if (loading) {
    return <div className="checkout-loading">Loading checkout...</div>;
  }

  if (!order) {
    return <div className="checkout-error">Invalid order. Order not found.</div>;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container" data-test-id="checkout-container">
        {/* Order Summary */}
        {!processing && (!paymentResult || paymentResult.status !== 'success') && (
          <div data-test-id="order-summary" className="order-summary">
            <h2>Complete Payment</h2>
            <div className="order-detail">
              <span>Amount: </span>
              <span data-test-id="order-amount">
                ₹{(order.amount / 100).toFixed(2)}
              </span>
            </div>
            <div className="order-detail">
              <span>Order ID: </span>
              <span data-test-id="order-id">{order.id}</span>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {!processing && !paymentResult && (
          <div data-test-id="payment-methods" className="payment-methods">
            <button
              data-test-id="method-upi"
              data-method="upi"
              className={`method-btn ${selectedMethod === 'upi' ? 'active' : ''}`}
              onClick={() => setSelectedMethod('upi')}
            >
              🔗 UPI
            </button>
            <button
              data-test-id="method-card"
              data-method="card"
              className={`method-btn ${selectedMethod === 'card' ? 'active' : ''}`}
              onClick={() => setSelectedMethod('card')}
            >
              💳 Card
            </button>
          </div>
        )}

        {/* UPI Form */}
        {selectedMethod === 'upi' && !processing && !paymentResult && (
          <form data-test-id="upi-form" onSubmit={handleUPISubmit} className="payment-form">
            <input
              data-test-id="vpa-input"
              type="text"
              placeholder="username@bank"
              value={upiData.vpa}
              onChange={(e) => setUpiData({ vpa: e.target.value })}
              required
            />
            <button data-test-id="pay-button" type="submit">
              Pay ₹{(order.amount / 100).toFixed(2)}
            </button>
          </form>
        )}

        {/* Card Form */}
        {selectedMethod === 'card' && !processing && !paymentResult && (
          <form data-test-id="card-form" onSubmit={handleCardSubmit} className="payment-form">
            <input
              data-test-id="card-number-input"
              type="text"
              placeholder="Card Number"
              value={cardData.number}
              onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
              maxLength="19"
              required
            />
            <div className="card-row">
              <input
                data-test-id="expiry-input"
                type="text"
                placeholder="MM/YY"
                value={`${cardData.expiry_month}${cardData.expiry_month && cardData.expiry_year ? '/' : ''}${cardData.expiry_year}`}
                onChange={(e) => {
                  const val = e.target.value.replace('/', '');
                  if (val.length <= 2) {
                    setCardData({ ...cardData, expiry_month: val, expiry_year: '' });
                  } else if (val.length <= 4) {
                    setCardData({ ...cardData, expiry_month: val.substring(0, 2), expiry_year: val.substring(2) });
                  }
                }}
                required
              />
              <input
                data-test-id="cvv-input"
                type="text"
                placeholder="CVV"
                value={cardData.cvv}
                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                maxLength="4"
                required
              />
            </div>
            <input
              data-test-id="cardholder-name-input"
              type="text"
              placeholder="Name on Card"
              value={cardData.holder_name}
              onChange={(e) => setCardData({ ...cardData, holder_name: e.target.value })}
              required
            />
            <button data-test-id="pay-button" type="submit">
              Pay ₹{(order.amount / 100).toFixed(2)}
            </button>
          </form>
        )}

        {/* Processing State */}
        {processing && (
          <div data-test-id="processing-state" className="processing-state">
            <div className="spinner"></div>
            <span data-test-id="processing-message">Processing payment...</span>
          </div>
        )}

        {/* Success State */}
        {paymentResult && paymentResult.status === 'success' && (
          <div data-test-id="success-state" className="success-state">
            <h2>✅ Payment Successful!</h2>
            <div className="result-detail">
              <span>Payment ID: </span>
              <span data-test-id="payment-id">{paymentResult.id}</span>
            </div>
            <span data-test-id="success-message">
              Your payment has been processed successfully
            </span>
          </div>
        )}

        {/* Error State */}
        {paymentResult && paymentResult.status === 'failed' && (
          <div data-test-id="error-state" className="error-state">
            <h2>❌ Payment Failed</h2>
            <span data-test-id="error-message">
              {paymentResult.error_description || 'Payment could not be processed'}
            </span>
            <button data-test-id="retry-button" onClick={handleRetry}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
