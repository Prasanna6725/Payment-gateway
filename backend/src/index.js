require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');

const healthRoutes = require('./routes/health');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRoutes);
app.use(orderRoutes);
app.use(paymentRoutes);

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Payment Gateway API running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
