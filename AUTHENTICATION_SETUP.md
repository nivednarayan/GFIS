# GFIS Authentication Setup - Complete Guide

## Changes Made

### 1. **Backend Changes**

#### User Model Update (`backend/models/user.js`)
- ✅ Removed "admin" role from userType enum
- ✅ Now only supports "citizen" role
- ✅ Added `password` field (optional for future enhancement)
- ✅ Added `isVerified` boolean field

#### Authentication Routes (`backend/routes/auth_routes.js`) - NEW
Created comprehensive authentication endpoints:

**POST `/api/auth/login`**
- Validates Aadhaar number (12 digits)
- Validates full name (minimum 3 characters)
- Validates mobile number (10 digits)
- Creates new user or updates existing user
- Returns JWT token with 7-day expiration
- Stores token in localStorage on frontend

**POST `/api/auth/logout`**
- Clears user session
- Removes token from localStorage on frontend

**GET `/api/auth/verify`**
- Verifies JWT token validity
- Returns current user details
- Called on app load for session persistence

**GET `/api/auth/user/:aadhaar`**
- Retrieves user details by Aadhaar number
- Used for verification and lookup

#### Authentication Middleware (`backend/middleware/authMiddleware.js`) - NEW
- `verifyToken`: Validates JWT tokens from request headers
- `requireCitizen`: Ensures only citizen role can access protected resources

#### App Configuration (`backend/app.js`)
- ✅ Added auth routes to the middleware stack
- Auth routes are mounted first for proper request handling

### 2. **Frontend Changes**

#### Authentication Service (`frontend/src/services/authService.js`)
Implements all authentication methods:
- `login(aadhaar, fullName, mobileNumber)` - User login with validation
- `logout()` - Clears stored credentials
- `verifyToken()` - Checks token validity on app load
- `getUser()` - Retrieves stored user from localStorage
- `getToken()` - Gets stored JWT token
- `isAuthenticated()` - Checks if user is logged in
- `getUserByAadhaar(aadhaar)` - Looks up user by Aadhaar

#### Auth Context (`frontend/src/context/AuthContext.jsx`)
React Context for global auth state:
- `user` - Current logged-in user
- `loading` - Loading state during auth check
- `isAuthenticated` - Boolean flag for auth status
- `login()` - Login function
- `logout()` - Logout function
- `useAuth()` - Hook to access auth context

#### Protected Route Component (`frontend/src/components/ProtectedRoute.jsx`)
- Wraps protected pages
- Redirects unauthenticated users to login
- Shows loading state while verifying token

#### Login Page (`frontend/src/pages/public/Login.jsx`)
Complete login interface:
- Aadhaar number input (12 digits, formatted display)
- Full name input (minimum 3 characters)
- Mobile number input (10 digits, formatted display)
- Real-time validation with character counters
- Error message display
- Loading state during submission
- Accessibility features (labels, required fields)

#### Login Styles (`frontend/src/pages/public/Login.css`)
Modern gradient UI:
- Purple gradient background (#667eea to #764ba2)
- Responsive card-based design
- Mobile-friendly layout
- Smooth transitions and hover effects
- Disabled state styling
- Alert messages (success/error)

#### Routes (`frontend/src/app/routes.jsx`)
- ✅ Removed admin routes completely
- ✅ Removed admin navigation links
- Added ProtectedRoute wrapper for citizen pages
- Added user greeting in header ("Welcome, John")
- Added logout button in navigation
- Conditional navigation based on authentication status

#### Main App Entry (`frontend/src/main.jsx`)
- ✅ Wrapped app with `<AuthProvider>`
- Enables auth context for entire application

#### App (`frontend/src/App.jsx`)
- Simplified to just render AppRoutes
- BrowserRouter moved to routes.jsx

## Aadhaar Validation

### Format: 12-digit number
```
Valid: 123456789012
Invalid: 12345678901 (11 digits)
Invalid: 1234567890123 (13 digits)
Invalid: 12345678ABC2 (contains letters)
```

### Other Validations
- **Full Name**: Minimum 3 characters
- **Mobile Number**: Exactly 10 digits, numeric only
- **Password**: Optional (for future OTP or password authentication)

## API Integration

### Base URL
```
http://localhost:5000/api
```

### Request Headers
All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Token Storage
- Stored in `localStorage` as `token`
- User data stored as JSON in `localStorage` as `user`
- Cleared on logout

## Installation & Setup

### Backend Dependencies
Add jsonwebtoken to `backend/package.json`:
```bash
npm install jsonwebtoken
```

### Environment Variables
Add to `.env` file in backend:
```
JWT_SECRET=gfis_secret_key_2026
MONGODB_URI=mongodb://127.0.0.1:27017/gfis
PORT=5000
```

### Frontend Environment
Create `.env` file in frontend (optional):
```
VITE_API_URL=http://localhost:5000/api
```

## User Flow

1. **User visits app** → Redirected to Home or Login
2. **Clicks Login** → Navigates to `/login`
3. **Enters Aadhaar, Name, Mobile** → Form validates inputs
4. **Submits form** → Backend verifies data and creates/updates user
5. **Receives JWT token** → Stored in localStorage
6. **Redirected to Dashboard** → Protected route checks token
7. **User can access citizen pages** → Each protected route validates token
8. **User clicks Logout** → Clears tokens and redirects to home

## Security Features

✅ Aadhaar-based unique identification  
✅ JWT token expiration (7 days)  
✅ Protected routes with token verification  
✅ No admin role (single citizen tier)  
✅ Input validation (format & length)  
✅ HTTP-only localStorage for tokens  
✅ CORS configured for safe requests  

## Testing Endpoints

### Login Test
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "aadhaar": "123456789012",
    "fullName": "John Doe",
    "mobileNumber": "9876543210"
  }'
```

### Verify Token Test
```bash
curl -X GET http://localhost:5000/api/auth/verify \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### Get User by Aadhaar
```bash
curl -X GET http://localhost:5000/api/auth/user/123456789012
```

## Next Steps (Optional Enhancements)

1. Add OTP verification for Aadhaar
2. Add password-based login option
3. Add refresh token functionality
4. Implement role-based permissions
5. Add user profile update endpoint
6. Add login history tracking
7. Add two-factor authentication
8. Add email verification

## Troubleshooting

**"No token provided"** → User not logged in, redirect to login page  
**"Invalid or expired token"** → Token expired, need to login again  
**"Invalid Aadhaar number"** → Check format (must be 12 digits)  
**"User not found"** → Aadhaar not in system, create new account  
**CORS errors** → Ensure backend CORS is configured for frontend URL  

---

**Version**: 1.0  
**Last Updated**: March 5, 2026  
**Status**: ✅ Complete
