# Architecture Documentation

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Payment Gateway                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
          ┌─────────▼─────┐  ┌──▼────────┐ ┌──▼──────────────┐
          │   Dashboard   │  │  Checkout │ │     API (REST)  │
          │   (React)     │  │  (React)  │ │   (Express.js)  │
          │   Port 3000   │  │ Port 3001 │ │    Port 8000    │
          └───────────────┘  └───────────┘ └────────┬────────┘
                                                     │
                                    ┌────────────────┴─────────────┐
                                    │                              │
                         ┌──────────▼──────────┐    ┌────────────▼─────┐
                         │   PostgreSQL        │    │ Authentication   │
                         │   Database          │    │ & Validation     │
                         │   Port 5432         │    │                  │
                         │                     │    └──────────────────┘
                         │ - Merchants         │
                         │ - Orders            │
                         │ - Payments          │
                         └─────────────────────┘
```

---

## Component Architecture

### Backend API (Express.js)

```
API Service
├── routes/
│   ├── health.js
│   │   └── GET /health
│   │   └── GET /api/v1/test/merchant
│   │
│   ├── orders.js
│   │   ├── POST /api/v1/orders (authenticated)
│   │   ├── GET /api/v1/orders/{id} (authenticated)
│   │   └── GET /api/v1/orders/{id}/public (public)
│   │
│   └── payments.js
│       ├── POST /api/v1/payments (authenticated)
│       ├── GET /api/v1/payments/{id} (authenticated)
│       ├── POST /api/v1/payments/public (public)
│       └── GET /api/v1/payments/{id}/public (public)
│
├── middleware/
│   └── authentication
│       ├── Validate X-Api-Key header
│       ├── Validate X-Api-Secret header
│       └── Fetch merchant from database
│
├── services/
│   ├── ValidationService
│   │   ├── validateVPA()
│   │   ├── validateCardNumber()
│   │   ├── detectCardNetwork()
│   │   └── validateExpiry()
│   │
│   ├── PaymentService
│   │   ├── createPayment()
│   │   ├── processPayment()
│   │   └── getPaymentStatus()
│   │
│   └── OrderService
│       ├── createOrder()
│       ├── getOrder()
│       └── getMerchantOrders()
│
├── models/
│   ├── Merchant
│   ├── Order
│   └── Payment
│
└── database/
    ├── Connection pooling
    ├── Query execution
    └── Error handling
```

---

### Frontend Dashboard (React)

```
Dashboard
├── pages/
│   ├── Login.jsx
│   │   └── Form submission
│   │   └── localStorage storage
│   │
│   ├── Dashboard.jsx
│   │   ├── API Credentials Display
│   │   └── Statistics Container
│   │       ├── Total Transactions
│   │       ├── Total Amount
│   │       └── Success Rate
│   │
│   └── Transactions.jsx
│       └── Transactions Table
│           ├── Payment ID
│           ├── Order ID
│           ├── Amount
│           ├── Method
│           ├── Status
│           └── Created At
│
├── components/
│   └── Reusable components
│
├── services/
│   └── API client (Axios)
│
└── styles/
    └── CSS modules
```

---

### Checkout Page (React)

```
Checkout
├── pages/
│   └── Checkout.jsx
│       ├── Order Summary Section
│       │   ├── Order ID
│       │   └── Amount Display
│       │
│       ├── Payment Method Selection
│       │   ├── UPI Button
│       │   └── Card Button
│       │
│       ├── UPI Form
│       │   └── VPA Input
│       │
│       ├── Card Form
│       │   ├── Card Number Input
│       │   ├── Expiry Input
│       │   ├── CVV Input
│       │   └── Holder Name Input
│       │
│       ├── Processing State
│       │   └── Spinner & Message
│       │
│       ├── Success State
│       │   ├── Success Message
│       │   └── Payment ID Display
│       │
│       └── Error State
│           ├── Error Message
│           └── Retry Button
│
└── styles/
    └── CSS modules
```

---

## Data Flow Architecture

### Order Creation Flow

```
┌────────────────┐
│ Merchant       │
│ POST /orders   │
│ with auth      │
└────────┬───────┘
         │
         ▼
┌─────────────────────┐
│ API Authentication  │
│ Validate API Key    │
│ Validate API Secret │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Input Validation    │
│ Check amount >= 100 │
│ Check currency      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Generate Order ID   │
│ Format: order_xxxx  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Create Order in DB  │
│ Set status created  │
│ Set timestamps      │
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│ Return 201 Created   │
│ with order details   │
└──────────────────────┘
```

---

### Payment Creation & Processing Flow

```
┌────────────────────────┐
│ Customer/App           │
│ POST /payments         │
│ with order_id & method │
└────────┬───────────────┘
         │
         ▼
┌──────────────────────────┐
│ Validate Order Exists    │
│ Belongs to merchant      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Validate Payment Method  │
│                          │
│ If UPI:                  │
│  - Validate VPA format   │
│                          │
│ If Card:                 │
│  - Validate card number  │
│  - Check Luhn algorithm  │
│  - Validate expiry       │
│  - Detect network        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Generate Payment ID      │
│ Format: pay_xxxx         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Create Payment in DB     │
│ Status: processing       │
│ Store only last4 & net   │
│ Never store CVV/full#    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Return 201 Accepted      │
│ Payment in processing    │
└────────┬─────────────────┘
         │
         ▼ (Async - non-blocking)
┌──────────────────────────┐
│ Simulate Processing      │
│ Delay: 5-10 seconds      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Determine Success/Fail   │
│                          │
│ UPI: 90% success        │
│ Card: 95% success       │
└────────┬─────────────────┘
         │
         ├─────┬──────┤
         │     │      │
    YES  ▼     │      ▼ NO
┌──────────┐  │  ┌──────────┐
│ Update   │  │  │ Update   │
│ SUCCESS  │  │  │ FAILED   │
└──────────┘  │  └──────────┘
              │
         (DB Updated)
         
┌──────────────────────────┐
│ Frontend Polls Status    │
│ GET /payments/{id}       │
│ Every 2 seconds          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Receive Final Status     │
│ Display Success/Failure  │
└──────────────────────────┘
```

---

## Database Schema Architecture

```
Merchants Table (Master)
┌───────────────────┐
│ id (UUID) - PK    │◄─────────────────────┐
│ name              │                      │
│ email (UNIQUE)    │                      │
│ api_key (UNIQUE)  │                      │
│ api_secret        │                      │
│ webhook_url       │                      │
│ is_active         │                      │
│ created_at        │                      │
│ updated_at        │                      │
└───────────────────┘                      │
        ▲                                   │
        │ 1:N relationship                  │
        │                                   │
        │                            ┌──────┴──────────┐
        │                            │                 │
   ┌────┴────────────┬──────────┐   │                 │
   │                 │          │   │                 │
   │                 ▼          ▼   │                 ▼
Orders Table    Payments Table  │  (FK: merchant_id)
┌─────────────┐ ┌────────────┐  │
│id-PK        │ │id-PK       │  │
│merchant_id  │◄│merchant_id │──┘
│ (FK)        │ │(FK)        │
│amount       │ │amount      │
│currency     │ │currency    │
│receipt      │ │method      │
│notes (JSON) │ │status      │
│status       │ │vpa         │
│created_at   │ │card_net    │
│updated_at   │ │card_last4  │
└────────┬────┘ │error_code  │
         │      │error_desc  │
         │      │created_at  │
         │      │updated_at  │
         └─────►│order_id(FK)│
         1:N    └────────────┘
     relationship
```

---

## Authentication Architecture

```
Client Request
│
├─ Header: X-Api-Key
├─ Header: X-Api-Secret
└─ Header: Content-Type

        │
        ▼
┌────────────────────────┐
│ Express Middleware     │
│ Check headers exist    │
└────────┬───────────────┘
         │
         ├─ Missing ──→ 401 AUTHENTICATION_ERROR
         │
         ▼
┌────────────────────────┐
│ Query Database         │
│ SELECT * FROM merchants│
│ WHERE api_key = ?      │
│ AND api_secret = ?     │
│ AND is_active = true   │
└────────┬───────────────┘
         │
         ├─ Not Found ──→ 401 AUTHENTICATION_ERROR
         │
         ▼
┌────────────────────────┐
│ Attach Merchant to     │
│ Request Context        │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ Route Handler          │
│ Execute Request        │
│ Use merchant context   │
└────────────────────────┘
```

---

## Validation Architecture

### VPA Validation
```
Input: "user@paytm"
    │
    ▼
Regex: ^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$
    │
    ├─ Match ──→ Valid
    │
    └─ No Match ──→ Invalid (INVALID_VPA)
```

### Card Number Validation
```
Input: "4111111111111111"
    │
    ▼ Remove spaces/dashes
"4111111111111111"
    │
    ▼ Check digits only & length 13-19
Valid format
    │
    ▼ Apply Luhn Algorithm
1. Start from right
2. Double every 2nd digit
3. If > 9, subtract 9
4. Sum all digits
5. Check sum % 10 == 0
    │
    ├─ Valid ──→ Luhn Check Pass
    │
    └─ Invalid ──→ INVALID_CARD
```

### Card Network Detection
```
Input: "4111111111111111"
    │
    ▼ Check first digits
Starts with 4?
    │
    ├─ YES ──→ Visa
    │
    └─ NO
        │
        ▼ Check if 51-55?
        │
        ├─ YES ──→ Mastercard
        │
        └─ NO
            │
            ▼ Check if 34 or 37?
            │
            ├─ YES ──→ Amex
            │
            └─ NO
                │
                ▼ Check if 60, 65, or 81-89?
                │
                ├─ YES ──→ RuPay
                │
                └─ NO ──→ Unknown
```

---

## Deployment Architecture (Docker)

```
docker-compose.yml
│
├─ postgres:15-alpine
│  ├─ Container: pg_gateway
│  ├─ Port: 5432
│  ├─ Volume: postgres_data
│  ├─ Healthcheck: pg_isready
│  └─ Environment: DB credentials
│
├─ backend (Express)
│  ├─ Container: gateway_api
│  ├─ Port: 8000
│  ├─ Depends_on: postgres (healthy)
│  ├─ Environment: DATABASE_URL, PORT
│  └─ Dockerfile: multi-stage build
│
├─ frontend (React)
│  ├─ Container: gateway_dashboard
│  ├─ Port: 3000
│  ├─ Depends_on: api
│  └─ Dockerfile: build + nginx
│
└─ checkout-page (React)
   ├─ Container: gateway_checkout
   ├─ Port: 3001
   ├─ Depends_on: api
   └─ Dockerfile: build + nginx

All connected via: gateway_network (bridge)
```

---

## Security Architecture

### API Security

```
Request comes in
    │
    ├─ HTTPS Check ────→ Production
    │
    ├─ CORS Check ─────→ Whitelist origins
    │
    ├─ Authentication ─→ Validate API Key/Secret
    │
    ├─ Authorization ──→ Check merchant ownership
    │
    ├─ Input Validation → Regex, type checks
    │
    ├─ Rate Limiting ──→ Per API key limits
    │
    └─ SQL Injection ──→ Parameterized queries
```

### Data Security

```
Card Data
├─ Full Number
│  └─ Validated then DISCARDED
│  └─ Never stored
│
├─ CVV
│  └─ Validated then DISCARDED
│  └─ Never logged
│
└─ Last 4 Digits + Network
   └─ Stored for reference
   └─ Cannot reconstruct full number

API Secret
├─ Never logged
├─ Never displayed in frontend
├─ Never sent to frontend
└─ Only compared server-side
```

---

## Scalability Architecture (Future)

```
Client Requests
    │
    ▼
┌──────────────────┐
│ Load Balancer    │
│ (Nginx/HAProxy)  │
└────┬─────────┬───┘
     │         │
     ▼         ▼
┌────────┐ ┌────────┐
│ API    │ │ API    │  (Multiple instances)
│ Instance│ │Instance│
└────┬───┘ └───┬────┘
     │         │
     └────┬────┘
          │
          ▼
     ┌────────────┐
     │ Connection │
     │   Pool     │ (Shared)
     └────┬───────┘
          │
          ▼
    ┌──────────────┐
    │  PostgreSQL  │
    │  (Master)    │
    └──────┬───────┘
           │
      ┌────┴────┐
      ▼         ▼
   [Replica] [Replica] (Read-only)
```

---

## Performance Architecture

### Caching Strategy

```
Client Request
    │
    ├─ Check Local Cache (Browser)
    │
    ├─ Check API Cache (Server)
    │  └─ Redis/Memcached
    │
    ├─ Check Database Query Cache
    │
    └─ Query Database (if miss)
        │
        ▼
    Store in Cache
```

### Async Processing

```
Synchronous (Blocking)      Asynchronous (Non-blocking)
├─ Order Creation           ├─ Payment Processing
├─ Return immediately        ├─ Return immediately
└─ ~50ms response time       ├─ Process in background
                             └─ Client polls for status
```

---

## Monitoring Architecture

```
Application
    │
    ├─ Logs ──────────→ ELK Stack / Splunk
    │
    ├─ Metrics ───────→ Prometheus / DataDog
    │
    ├─ Traces ───────→ Jaeger / DataDog APM
    │
    └─ Alerts ───────→ PagerDuty / Slack
```

---

## Directory Structure

```
payment-gateway/
│
├── docker-compose.yml         # Orchestration
├── .env.example               # Environment template
├── .gitignore                 # Git exclusions
│
├── README.md                  # Main documentation
├── QUICKSTART.md             # Quick start guide
├── API_DOCUMENTATION.md       # API reference
├── DATABASE_SCHEMA.md         # Database docs
├── DEPLOYMENT_TESTING.md      # Deployment guide
├── ARCHITECTURE.md            # This file
│
├── backend/                   # Express API
│   ├── Dockerfile            # API container
│   ├── package.json          # Dependencies
│   ├── .env.example          # Environment
│   └── src/
│       ├── index.js          # Entry point
│       ├── db.js             # DB connection
│       ├── database.js       # Initialization
│       ├── utils.js          # Validation helpers
│       ├── schema.sql        # DB schema
│       └── routes/
│           ├── health.js     # Health endpoints
│           ├── orders.js     # Order endpoints
│           └── payments.js   # Payment endpoints
│
├── frontend/                  # React Dashboard
│   ├── Dockerfile            # Frontend container
│   ├── package.json          # Dependencies
│   ├── vite.config.js        # Vite config
│   ├── index.html            # HTML template
│   ├── nginx.conf            # Nginx config
│   └── src/
│       ├── main.jsx          # Entry point
│       ├── App.jsx           # Root component
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           └── Transactions.jsx
│
└── checkout-page/            # React Checkout
    ├── Dockerfile           # Checkout container
    ├── package.json         # Dependencies
    ├── vite.config.js       # Vite config
    ├── index.html           # HTML template
    ├── nginx.conf           # Nginx config
    └── src/
        ├── main.jsx         # Entry point
        ├── App.jsx          # Root component
        └── pages/
            ├── Checkout.jsx
            └── Checkout.css
```

---

## Summary

The payment gateway architecture follows **layered architecture** principles:

1. **Presentation Layer**: React frontends (Dashboard, Checkout)
2. **API Layer**: Express.js REST API with validation
3. **Business Logic Layer**: Payment processing, validation
4. **Data Access Layer**: PostgreSQL with ORM queries
5. **Infrastructure Layer**: Docker, networking

The system is:
- ✅ Scalable: Stateless API, can run multiple instances
- ✅ Secure: Input validation, API key authentication, no card storage
- ✅ Maintainable: Modular code, clear separation of concerns
- ✅ Reliable: Database persistence, error handling
- ✅ Deployable: Docker containerization, health checks

---

For detailed API information, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
For database details, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
