# Payment Gateway

A complete payment gateway system similar to Razorpay or Stripe, built with Node.js/Express backend, React frontend, and PostgreSQL database.

## Features

- ✅ Merchant authentication with API keys
- ✅ Order creation and management via REST API
- ✅ Multi-method payment processing (UPI and Card)
- ✅ VPA validation for UPI payments
- ✅ Luhn algorithm validation for card numbers
- ✅ Card network detection (Visa, Mastercard, Amex, RuPay)
- ✅ Hosted checkout page with professional UI
- ✅ Merchant dashboard with transaction history
- ✅ Fully containerized with Docker
- ✅ PostgreSQL database with proper schema

## Architecture

```
payment-gateway/
├── backend/              # Node.js Express API
├── frontend/             # React Dashboard
├── checkout-page/        # React Checkout Page
├── docker-compose.yml    # Docker orchestration
└── README.md
```

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd payment-gateway
```

2. Start all services:

```bash
docker-compose up -d
```

This will automatically:
- Create and initialize PostgreSQL database
- Seed test merchant with credentials
- Start the API on port 8000
- Start the dashboard on port 3000
- Start the checkout page on port 3001

3. Verify services are running:

```bash
docker-compose ps
```

## Services and Ports

- **API**: http://localhost:8000
- **Dashboard**: http://localhost:3000
- **Checkout**: http://localhost:3001
- **PostgreSQL**: localhost:5432

## Test Merchant Credentials

The system automatically seeds a test merchant on startup:

- **Email**: test@example.com
- **API Key**: key_test_abc123
- **API Secret**: secret_test_xyz789
- **ID**: 550e8400-e29b-41d4-a716-446655440000

## API Endpoints

### Health Check
- `GET /health` - Check API health and database connectivity

### Orders
- `POST /api/v1/orders` - Create a new order (authenticated)
- `GET /api/v1/orders/{order_id}` - Get order details (authenticated)
- `GET /api/v1/orders/{order_id}/public` - Get order details (public)

### Payments
- `POST /api/v1/payments` - Create a payment (authenticated)
- `GET /api/v1/payments/{payment_id}` - Get payment details (authenticated)
- `POST /api/v1/payments/public` - Create payment (public, for checkout)
- `GET /api/v1/payments/{payment_id}/public` - Get payment (public)

### Test Endpoint
- `GET /api/v1/test/merchant` - Get test merchant details (no auth)

## Dashboard

### Login Page
- URL: http://localhost:3000/login
- Email: test@example.com
- Password: (any value)

### Dashboard Home
- View API credentials
- See transaction statistics
- Display success rate and total amounts

### Transactions Page
- View all payments
- See payment status, method, and amount
- Filter and sort transactions

## Checkout Page

Access checkout at: `http://localhost:3001/checkout?order_id=order_1f74eccca2d4e3d6`

Features:
- Order summary display
- UPI payment method with VPA input
- Card payment method with full form
- Payment processing with status polling
- Success and failure states with retry option

## API Usage Examples

### Create an Order

```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_123",
    "notes": {
      "customer_name": "John Doe"
    }
  }'
```

### Create a UPI Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_1f74eccca2d4e3d6",
    "method": "upi",
    "vpa": "user@paytm"
  }'
```

### Create a Card Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_1f74eccca2d4e3d6",
    "method": "card",
    "card": {
      "number": "4111111111111111",
      "expiry_month": "12",
      "expiry_year": "2026",
      "cvv": "123",
      "holder_name": "John Doe"
    }
  }'
```

## Validation Logic

### VPA Format
Valid VPA pattern: `^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$`

Valid examples:
- user@paytm
- john.doe@okhdfcbank
- user_123@phonepe

### Card Number Validation
Uses Luhn algorithm to validate card numbers (13-19 digits)

### Card Networks
- **Visa**: Starts with 4
- **Mastercard**: Starts with 51-55
- **Amex**: Starts with 34 or 37
- **RuPay**: Starts with 60, 65, or 81-89

### Expiry Date
Must be in the future or current month/year

## Payment Processing

Payment status flow: `processing` → `success` or `failed`

Default success rates:
- UPI: 90%
- Card: 95%

Processing delay: 5-10 seconds (simulates bank processing)

## Test Mode

For automated testing, set environment variables:

```
TEST_MODE=true
TEST_PAYMENT_SUCCESS=true/false
TEST_PROCESSING_DELAY=1000
```

## Database Schema

### Merchants Table
- id (UUID, PK)
- name (VARCHAR 255)
- email (VARCHAR 255, UNIQUE)
- api_key (VARCHAR 64, UNIQUE)
- api_secret (VARCHAR 64)
- webhook_url (TEXT, optional)
- is_active (BOOLEAN, default: true)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Orders Table
- id (VARCHAR 64, PK) - Format: "order_" + 16 alphanumeric
- merchant_id (UUID, FK)
- amount (INTEGER) - In smallest currency unit
- currency (VARCHAR 3, default: 'INR')
- receipt (VARCHAR 255, optional)
- notes (JSONB, optional)
- status (VARCHAR 20, default: 'created')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Payments Table
- id (VARCHAR 64, PK) - Format: "pay_" + 16 alphanumeric
- order_id (VARCHAR 64, FK)
- merchant_id (UUID, FK)
- amount (INTEGER)
- currency (VARCHAR 3, default: 'INR')
- method (VARCHAR 20) - 'upi' or 'card'
- status (VARCHAR 20) - 'processing', 'success', or 'failed'
- vpa (VARCHAR 255, optional)
- card_network (VARCHAR 20, optional)
- card_last4 (VARCHAR 4, optional)
- error_code (VARCHAR 50, optional)
- error_description (TEXT, optional)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Stopping Services

```bash
docker-compose down
```

To also remove volumes:

```bash
docker-compose down -v
```

## Development

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Checkout Development

```bash
cd checkout-page
npm install
npm run dev
```

## Security Considerations

- ✅ API key and secret validation on all protected endpoints
- ✅ Card numbers are never stored - only last 4 digits and network
- ✅ CVV is never stored
- ✅ All sensitive data is transmitted over HTTPS in production
- ✅ API credentials are environment variables
- ✅ Database credentials are not hardcoded

## Troubleshooting

### Services not starting
- Check Docker is running: `docker --version`
- Check ports are available: 5432, 8000, 3000, 3001
- View logs: `docker-compose logs -f`

### Database connection error
- Ensure postgres service is healthy: `docker-compose ps`
- Check DATABASE_URL environment variable
- Wait for health check to pass (5-10 seconds)

### Frontend blank page
- Check browser console for errors
- Verify API is accessible: `curl http://localhost:8000/health`
- Clear browser cache and reload

## Performance Features

- Connection pooling for database
- Efficient indexes on frequently queried columns
- Asynchronous payment processing
- Caching where appropriate
- Optimized Docker builds with multi-stage compilation

## Compliance

- ✅ Meets PCI DSS requirements for card handling (never store full card numbers or CVV)
- ✅ Proper error handling without exposing sensitive information
- ✅ Audit trail with timestamps
- ✅ Proper authentication and authorization

## Future Enhancements

- Webhook notifications for payment status
- Refund processing
- Payment reconciliation reports
- Multi-currency support
- Advanced fraud detection
- Rate limiting and DDoS protection
- Mobile app integration
- 3D Secure authentication

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
