# SwaAstha Backend API

A comprehensive Node.js backend for the SwaAstha Healthcare Application providing patient management, doctor services, health records, and pharmacy order management.

## 🚀 Features

- **Patient Management**
  - OTP-based authentication
  - Profile management
  - Health history tracking
  
- **Doctor Portal**
  - Doctor registration & verification
  - Patient search and record access
  - Health record management
  
- **Health Records**
  - Store and retrieve medical records
  - Categorized health history
  - Doctor notes and annotations
  
- **Pharmacy Services**
  - Medicine order placement
  - Order tracking
  - Delivery management
  - Inventory search across 1215 Indian medicines (CSV-backed)
  - Generic/branded substitute lookup via salt match
  - Idempotent checkout (safe against double-billing)

- **AI Prescription Scanner** (Gemini-powered)
  - Upload prescription image → OCR + structured medicine extraction
  - Two-pass: full image, then header crop if patient/doctor missing
  - Fuzzy-matches extracted brand names against the Indian medicine DB
  - Falls back gracefully when `GEMINI_API_KEY` is not set

- **Admin Panel**
  - Doctor verification queue (pending/under-review/approved/rejected)
  - Browser UI at `/admin?secret=<ADMIN_SECRET>`
  - JSON endpoints under `/api/admin/*` (gated by query secret or `X-Admin-Secret` header)

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
cd swaastha-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/swaastha
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

4. **Start MongoDB**
```bash
# On Linux/Mac
sudo systemctl start mongod

# On Windows
net start MongoDB
```

5. **Run the server**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## 📁 Project Structure

```
swaastha-backend/
├── models/              # Database models
│   ├── Patient.model.js
│   ├── Doctor.model.js
│   ├── HealthRecord.model.js
│   ├── PharmacyOrder.model.js
│   └── OTP.model.js
├── routes/              # API routes
│   ├── auth.routes.js
│   ├── doctor.routes.js
│   ├── patient.routes.js
│   ├── healthRecords.routes.js
│   └── pharmacy.routes.js
├── middleware/          # Custom middleware
│   └── auth.middleware.js
├── utils/               # Utility functions
│   ├── jwt.util.js
│   └── otp.util.js
├── server.js           # Main application file
├── package.json
└── .env.example
```

## 🔐 API Endpoints

### Authentication (Patient)

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "requireAccount": false
}
```

#### Register Patient
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "age": 30,
  "phone": "9876543210",
  "otp": "123456"
}
```

#### Login Patient
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456"
}
```

#### Get Patient Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update Patient Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "john@example.com",
  "gender": "male",
  "bloodGroup": "O+"
}
```

### Authentication (Doctor)

#### Send OTP (Doctor)
```http
POST /api/auth/doctor/send-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "requireAccount": false
}
```

#### Register Doctor
```http
POST /api/auth/doctor/register
Content-Type: application/json

{
  "name": "Dr. Jane Smith",
  "phone": "9876543210",
  "registrationNumber": "MED12345",
  "specialization": "Cardiology",
  "degree": "MBBS, MD",
  "otp": "123456"
}
```

#### Login Doctor
```http
POST /api/auth/doctor/login
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456"
}
```

### Doctor Routes

#### Get Doctor Profile
```http
GET /api/doctor/profile
Authorization: Bearer <doctor_token>
```

#### Update Doctor Profile
```http
PUT /api/doctor/profile
Authorization: Bearer <doctor_token>
Content-Type: application/json

{
  "email": "doctor@example.com",
  "clinicName": "City Hospital",
  "city": "Mumbai"
}
```

#### Search Patient
```http
GET /api/doctor/patient/SWA-100001
Authorization: Bearer <doctor_token>
```

#### Get Recent Patients
```http
GET /api/doctor/patients/recent
Authorization: Bearer <doctor_token>
```

#### Add Health Record for Patient
```http
POST /api/doctor/patient/SWA-100001/record
Authorization: Bearer <doctor_token>
Content-Type: application/json

{
  "title": "Blood Test Results",
  "category": "report",
  "type": "blood-test",
  "notes": "Normal values, follow up in 3 months"
}
```

### Health Records

#### Get Health Records
```http
GET /api/health-records
Authorization: Bearer <token>
```

Query parameters:
- `category`: Filter by category (report, prescription, bill, etc.)
- `type`: Filter by type (blood-test, scan, etc.)
- `limit`: Maximum records to return

#### Add Health Record
```http
POST /api/health-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Blood Test Report",
  "category": "report",
  "type": "blood-test",
  "source": "upload",
  "meta": {
    "testDate": "2024-03-08",
    "lab": "City Diagnostics"
  }
}
```

#### Get Specific Record
```http
GET /api/health-records/:id
Authorization: Bearer <token>
```

#### Delete Health Record
```http
DELETE /api/health-records/:id
Authorization: Bearer <token>
```

### Pharmacy Orders

#### Place Order
```http
POST /api/pharmacy/order
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "name": "Paracetamol 500mg",
      "use": "Fever, Pain relief",
      "dose": "1-2 tablets",
      "price": "₹25",
      "numPrice": 25,
      "category": "Pain Relief",
      "qty": 2
    }
  ],
  "address": "123 Main Street, Mumbai",
  "subtotal": 50,
  "deliveryFee": 40,
  "total": 90,
  "totalItems": 2,
  "estimatedDelivery": "30-60 mins"
}
```

#### Get Order History
```http
GET /api/pharmacy/orders
Authorization: Bearer <token>
```

#### Get Specific Order
```http
GET /api/pharmacy/orders/:orderId
Authorization: Bearer <token>
```

#### Cancel Order
```http
PATCH /api/pharmacy/orders/:orderId/cancel
Authorization: Bearer <token>
```

## 🔒 Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained after successful registration or login.

## 📊 Database Models

### Patient
- Basic info (name, age, phone)
- Auto-generated Patient ID (SWA-XXXXXX)
- Medical information (allergies, conditions, medications)
- Emergency contact details

### Doctor
- Professional details (registration number, specialization, degree)
- Verification status
- Practice information (clinic, city, experience)
- Statistics (patients viewed, records accessed)

### HealthRecord
- Patient reference
- Record details (title, category, type)
- File information
- Doctor notes (if applicable)

### PharmacyOrder
- Order details and items
- Delivery information
- Status tracking
- Payment information

### OTP
- Phone number
- OTP code (6 digits)
- Purpose (registration, login, verification)
- Auto-expiry (10 minutes)

## 🧪 Testing

In development mode, OTPs are logged to the console instead of being sent via SMS:

```
📱 OTP for 9876543210: 123456
⏰ Valid for 10 minutes
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/swaastha |
| JWT_SECRET | Secret for JWT tokens | (required) |
| JWT_EXPIRES_IN | Token expiration time | 30d |
| NODE_ENV | Environment (development/production) | development |
| TWILIO_ACCOUNT_SID | Twilio account SID (production) | - |
| TWILIO_AUTH_TOKEN | Twilio auth token (production) | - |
| TWILIO_PHONE_NUMBER | Twilio phone number (production) | - |

## 📱 Integration with Frontend

The backend is designed to work seamlessly with the SwaAstha frontend application. Update the frontend's API base URL to point to your backend:

```javascript
const BASE_URL = "http://localhost:5000/api/auth";
```

## 🚨 Error Handling

All API responses follow a consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

## 🛡️ Security Features

- JWT-based authentication
- OTP verification for user authentication
- Password-less login system
- Protected routes with middleware
- Input validation
- MongoDB injection prevention

## 📝 License

ISC

## 👥 Support

For issues and questions, please create an issue in the repository.

---

Built with ❤️ for SwaAstha Healthcare
