import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (email === 'test@example.com' && password) {
      localStorage.setItem('merchant', JSON.stringify({
        email: 'test@example.com',
        apiKey: 'key_test_abc123',
        apiSecret: 'secret_test_xyz789'
      }));
      navigate('/dashboard');
    } else if (!password) {
      setError('Please enter a password');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Payment Gateway</h1>
        <h2>Merchant Login</h2>
        <form data-test-id="login-form" onSubmit={handleLogin}>
          <input
            data-test-id="email-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            data-test-id="password-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error">{error}</div>}
          <button data-test-id="login-button" type="submit">
            Login
          </button>
        </form>
        <p className="hint">Use: test@example.com / any password</p>
      </div>
    </div>
  );
}
