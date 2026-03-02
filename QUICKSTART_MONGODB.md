# 🚀 Quick Start Guide - MongoDB Persistence

## What's New
- ✅ Backend now stores all application data in MongoDB
- ✅ Frontend fetches scheme data from backend API
- ✅ Real-time answer persistence as user fills form
- ✅ Applications can be retrieved later using Reference ID

## Running the Application

### Terminal 1 - Backend (Port 5000)
```bash
cd backend
npm install
npm start
```
✅ Should show: "Server running on port 5000" + "MongoDB Connected"

### Terminal 2 - Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
✅ Open http://localhost:5173

## Testing the Flow

1. **Login** as Citizen
2. **Apply** → Select a scheme (e.g., PMAY)
3. **Answer questions** using voice or text
4. **Submit** — See your Reference ID (e.g., APP-61901095-SEQDMX)
5. **Data is saved** in MongoDB permanently ✨

## API Endpoints (All Working)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/schemes` | List all 5 schemes |
| GET | `/api/schemes/:schemeId/fields` | Get scheme fields |
| POST | `/api/applications` | Create new application |
| POST | `/api/applications/:id/save-answer` | Save each answer |
| POST | `/api/applications/:id/submit` | Finalize application |
| GET | `/api/applications/:id` | Retrieve application |

## Database Location
```
mongodb://127.0.0.1:27017/gfis
```
- Collection: `applications`
- Collections: `users`, `userinputs` (for audit trail)

## Verify It's Working

```bash
# Test backend
curl http://localhost:5000/api/schemes

# Test MongoDB connection (should not error)
mongosh
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB Connection Error | Make sure MongoDB service is running |
| Port 5000 In Use | `netstat -ano \| findstr :5000` and kill process |
| Module Not Found | Run `npm install` in backend folder |
| CORS Errors | Backend CORS already configured ✓ |

## Next Features (Optional)
- Document upload storage
- Officer review dashboard  
- Email notifications
- Admin analytics
- Application status tracking

---
**See `MONGODB_SETUP.md` for detailed configuration**
