# Setup Guide - Cozy Property Connect

This guide will help you set up both the frontend and backend for the Cozy Property Connect application.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000`

**Default Users:**
- Admin: `admin@gmail.com` / `admin123`
- Landlord: `landlord@blockrent.com` / `landlord123`
- Tenant: `tenant@blockrent.com` / `tenant123`

## Frontend Setup

1. Install dependencies (if not already installed):
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

## Features Implemented

### Authentication
- ✅ Simple mock authentication (no JWT)
- ✅ Login/Register forms connected to backend
- ✅ User role and ID stored in localStorage
- ✅ Role-based route protection

### Properties
- ✅ Fetch properties from backend
- ✅ Create new properties (landlords)
- ✅ View property details
- ✅ Delete properties (owners/admins)

### Rental Requests
- ✅ Submit rental requests (tenants)
- ✅ View requests (tenants and landlords)
- ✅ Respond to requests (landlords)
- ✅ Negotiate terms

### Agreements
- ✅ Finalize agreements
- ✅ View agreements (tenants and landlords)
- ✅ Download agreement PDFs
- ✅ View blockchain hash

## API Endpoints

All API endpoints are prefixed with `/api`:

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/profile`

### Properties
- `GET /api/properties`
- `GET /api/properties/:id`
- `POST /api/properties`
- `DELETE /api/properties/:id`

### Requests
- `POST /api/requests`
- `GET /api/requests/user`
- `GET /api/requests/landlord`
- `PATCH /api/requests/:id/respond`

### Agreements
- `POST /api/agreements/finalize`
- `GET /api/agreements/user`
- `GET /api/agreements/landlord`
- `GET /api/agreements/:id/hash`

## Project Structure

```
├── backend/
│   ├── routes/          # API route handlers
│   ├── database.js      # SQLite database setup
│   └── server.js        # Express server
├── src/
│   ├── services/        # API service (Axios)
│   ├── contexts/        # Auth context
│   ├── pages/           # React pages
│   ├── components/     # React components
│   └── types/           # TypeScript types
```

## Notes

- The backend uses SQLite for simplicity
- Authentication is mock-based (no JWT) - user ID is sent in headers
- Blockchain hashing uses SHA-256
- PDF agreements are generated using PDFKit
- All passwords are hashed using SHA-256

## Troubleshooting

1. **Backend won't start**: Make sure port 5000 is not in use
2. **Frontend can't connect**: Ensure backend is running on port 5000
3. **Database errors**: Delete `backend/database.sqlite` and restart the server
4. **CORS errors**: Backend has CORS enabled, but check if both servers are running
