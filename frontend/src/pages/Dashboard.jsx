import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

export default function Dashboard() {
  const [merchant, setMerchant] = useState(null);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const storedMerchant = localStorage.getItem('merchant');
    if (!storedMerchant) {
      navigate('/login');
      return;
    }
    
    const parsed = JSON.parse(storedMerchant);
    setMerchant(parsed);
    
    fetchStats(parsed);
  }, [navigate]);

  const fetchStats = async (merchantData) => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/test/merchant');
      
      const paymentsResponse = await axios.get('http://localhost:8000/api/v1/payments', {
        headers: {
          'X-Api-Key': merchantData.apiKey,
          'X-Api-Secret': merchantData.apiSecret
        }
      }).catch(() => ({ data: [] }));
      
      const payments = paymentsResponse.data || [];
      const totalTransactions = payments.length;
      const successfulPayments = payments.filter(p => p.status === 'success');
      const totalAmount = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const successRate = totalTransactions > 0 ? Math.round((successfulPayments.length / totalTransactions) * 100) : 0;
      
      setStats({
        totalTransactions,
        totalAmount,
        successRate
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('merchant');
    navigate('/login');
  };

  const handleViewTransactions = () => {
    navigate('/dashboard/transactions');
  };

  if (!merchant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-content">
          <h1>Payment Gateway</h1>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="main-section">
          <h2>Welcome, {merchant.email}</h2>

          <div data-test-id="dashboard" className="dashboard-section">
            <div data-test-id="api-credentials" className="credentials-card">
              <h3>API Credentials</h3>
              <div className="credential-item">
                <label>API Key</label>
                <span data-test-id="api-key" className="credential-value">
                  {merchant.apiKey}
                </span>
                <button onClick={() => navigator.clipboard.writeText(merchant.apiKey)} className="copy-btn">
                  Copy
                </button>
              </div>
              <div className="credential-item">
                <label>API Secret</label>
                <span data-test-id="api-secret" className="credential-value">
                  {merchant.apiSecret}
                </span>
                <button onClick={() => navigator.clipboard.writeText(merchant.apiSecret)} className="copy-btn">
                  Copy
                </button>
              </div>
            </div>

            <div data-test-id="stats-container" className="stats-container">
              <div className="stat-card">
                <div className="stat-label">Total Transactions</div>
                <div data-test-id="total-transactions" className="stat-value">
                  {stats.totalTransactions}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Amount</div>
                <div data-test-id="total-amount" className="stat-value">
                  ₹{(stats.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Success Rate</div>
                <div data-test-id="success-rate" className="stat-value">
                  {stats.successRate}%
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleViewTransactions} className="view-transactions-btn">
            View Transactions
          </button>
        </div>
      </div>
    </div>
  );
}
