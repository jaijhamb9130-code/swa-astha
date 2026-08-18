# Quick Start Guide - SwaAstha Backend

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd swaastha-backend
npm install
```

### Step 2: Setup Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your MongoDB URI (or use default)
# Default: mongodb://localhost:27017/swaastha
```

### Step 3: Start MongoDB
Make sure MongoDB is running on your system:

**Linux/Mac:**
```bash
sudo systemctl start mongod
# or
brew services start mongodb-community
```

**Windows:**
```bash
net start MongoDB
```

**Docker:**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 4: Seed the Database (Optional)
Populate the database with sample data:
```bash
npm run seed
```

This creates:
- 3 sample patients
- 3 sample doctors
- Health records
- Pharmacy orders

### Step 5: Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:5000`

---

## 🧪 Test the API

### Using Browser
Visit: `http://localhost:5000/api/health`

Expected response:
```json
{
  "status": "ok",
  "message": "SwaAstha Backend is running",
  "timestamp": "2024-03-08T10:30:00.000Z"
}
```

### Using Postman
1. Import `postman_collection.json` into Postman
2. The collection includes all API endpoints
3. Variables are automatically set after login

### Using curl

**1. Send OTP:**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "requireAccount": false
  }'
```

**2. Register Patient:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "age": 30,
    "phone": "9876543210",
    "otp": "123456"
  }'
```

**Note:** In development mode, any 6-digit OTP works! The actual OTP is logged to console.

---

## 📱 Connect to Frontend

Update your frontend's API base URL to:
```javascript
const BASE_URL = "http://localhost:5000/api/auth";
```

Or if running on different machine:
```javascript
const BASE_URL = "http://YOUR_IP:5000/api/auth";
```

---

## 🔑 Sample Credentials (After Seeding)

### Patients:
| Name | Phone | Patient ID |
|------|-------|------------|
| Rajesh Kumar | 9876543210 | SWA-100001 |
| Priya Sharma | 9876543211 | SWA-100002 |
| Amit Patel | 9876543212 | SWA-100003 |

### Doctors:
| Name | Phone | Specialization |
|------|-------|----------------|
| Dr. Sarah Johnson | 9123456789 | Cardiology |
| Dr. Arjun Reddy | 9123456790 | General Medicine |
| Dr. Kavita Desai | 9123456791 | Pediatrics |

**OTP in Development:** Any 6-digit number (e.g., 123456)

---

## 🔧 Common Issues

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process or change PORT in .env
```

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongosh  # Should connect successfully

# If not installed, install MongoDB:
# https://www.mongodb.com/docs/manual/installation/
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Monitor the Server

The server logs all important events:
- ✅ MongoDB connection
- 📱 OTP generation (development mode)
- 🔐 Authentication attempts
- ❌ Errors

Example console output:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
📍 Environment: development
🔗 API Base URL: http://localhost:5000/api

📱 OTP for 9876543210: 123456
⏰ Valid for 10 minutes
```

---

## 🎯 Next Steps

1. **Test Authentication Flow:**
   - Send OTP → Register → Login → Get Profile

2. **Test Doctor Features:**
   - Register doctor → Search patient → View records

3. **Test Pharmacy:**
   - Place order → View order history

4. **Integrate with Frontend:**
   - Update frontend API URLs
   - Test full user flows

5. **Production Setup:**
   - Configure Twilio for real SMS
   - Set strong JWT_SECRET
   - Use production MongoDB
   - Enable HTTPS

---

## 📚 Documentation

- Full API Documentation: [README.md](README.md)
- Postman Collection: `postman_collection.json`
- Database Models: `models/` directory

---

## 🆘 Need Help?

- Check server console for errors
- Review README.md for detailed API docs
- Ensure all environment variables are set
- Verify MongoDB is running

---

Happy Coding! 🎉
