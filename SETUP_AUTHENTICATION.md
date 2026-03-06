## Installation Commands

### Backend Setup

Navigate to backend and install jsonwebtoken:
```bash
cd backend
npm install jsonwebtoken
```

### Frontend Setup (if not already done)
```bash
cd frontend
npm install
```

## Quick Start

### 1. Start Backend
```bash
cd backend
npm run dev
# Or: npm start
```

Server will run on: `http://localhost:5000`

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

Frontend will run on: `http://localhost:5173` or `http://localhost:5000` (depending on Vite config)

### 3. Test the Login Flow
1. Open frontend in browser
2. Click "Login"
3. Enter test credentials:
   - Aadhaar: `123456789012` (or any 12 digits)
   - Full Name: `John Doe` (minimum 3 chars)
   - Mobile: `9876543210` (exactly 10 digits)
4. Click "Login"
5. Should redirect to citizen dashboard

## Environment Variables

Create `.env` file in `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/gfis
JWT_SECRET=gfis_secret_key_2026
```

## Key Changes Summary

### ✅ Removed
- Admin role from user model
- Admin routes and pages
- Admin navigation links
- Role-based access to admin features

### ✅ Added
- Aadhaar-based authentication
- JWT token support
- Protected routes
- Auth context for state management
- Login page with validation
- Auth middleware
- Complete authentication service

### ✅ Updated
- User model (no admin role)
- Frontend routes (protected routes)
- App entry point (AuthProvider wrapper)
- Header navigation (conditional rendering)

## File Structure

```
backend/
├── routes/
│   └── auth_routes.js ✨ NEW - Authentication endpoints
├── middleware/
│   └── authMiddleware.js ✨ NEW - Token verification
├── models/
│   └── user.js (UPDATED - removed admin role)
└── app.js (UPDATED - added auth routes)

frontend/
├── src/
│   ├── pages/
│   │   └── public/
│   │       ├── Login.jsx (UPDATED - Aadhaar form)
│   │       └── Login.css ✨ NEW - Styling
│   ├── services/
│   │   └── authService.js (UPDATED - auth methods)
│   ├── context/
│   │   └── AuthContext.jsx (UPDATED - auth provider)
│   ├── components/
│   │   └── ProtectedRoute.jsx ✨ NEW - Route protection
│   ├── app/
│   │   └── routes.jsx (UPDATED - removed admin, added protection)
│   ├── App.jsx (UPDATED - simplified)
│   └── main.jsx (UPDATED - AuthProvider wrapper)
```

## Dependencies to Install

```bash
cd backend
npm install jsonwebtoken
```

## Status

✅ **Complete** - Ready to use

All authentication features are implemented and ready for testing.
