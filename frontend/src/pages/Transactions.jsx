import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Transactions.css';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedMerchant = localStorage.getItem('merchant');
    if (!storedMerchant) {
      navigate('/login');
      return;
    }
    
    const parsed = JSON.parse(storedMerchant);
    setMerchant(parsed);
    
    fetchTransactions(parsed);
  }, [navigate]);

  const fetchTransactions = async (merchantData) => {
    try {
      setLoading(true);
      
      const paymentsResponse = await axios.get('http://localhost:8000/api/v1/payments', {
        headers: {
          'X-Api-Key': merchantData.apiKey,
          'X-Api-Secret': merchantData.apiSecret
        }
      }).catch(() => ({ data: [] }));
      
      setTransactions(paymentsResponse.data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // refetch when window gains focus (helps show recent failed/success updates)
  useEffect(() => {
    const onFocus = () => {
      const storedMerchant = localStorage.getItem('merchant');
      if (!storedMerchant) return;
      const parsed = JSON.parse(storedMerchant);
      fetchTransactions(parsed);
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (!merchant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="transactions-container">
      <nav className="navbar">
        <div className="navbar-content">
          <h1>Payment Gateway</h1>
          <button onClick={handleBack} className="back-btn">← Back</button>
        </div>
      </nav>

      <div className="transactions-content">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
          <div>
            <h2>Transaction History</h2>
            <p style={{margin: 0, fontSize: 12, color: '#666'}}>Merchant: {merchant?.email}</p>
          </div>
          <button className="back-btn" onClick={() => fetchTransactions(merchant)}>Refresh</button>
        </div>
        
        {loading ? (
          <div className="loading">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">No transactions yet</div>
        ) : (
          <div className="table-wrapper">
            <table data-test-id="transactions-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Order ID</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} data-test-id="transaction-row" data-payment-id={transaction.id}>
                    <td data-test-id="payment-id">{transaction.id}</td>
                    <td data-test-id="order-id">{transaction.order_id}</td>
                    <td data-test-id="amount">{transaction.amount}</td>
                    <td data-test-id="method">{transaction.method}</td>
                    <td data-test-id="status">
                      <span className={`status-badge status-${transaction.status}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td data-test-id="created-at">
                      {new Date(transaction.created_at).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}