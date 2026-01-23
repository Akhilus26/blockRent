# Installation & Setup Guide

## Prerequisites

- Node.js (v18 or higher) - [Download here](https://nodejs.org/)
- npm (comes with Node.js)

## Step 1: Install Backend Dependencies

1. Open a terminal/command prompt
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```

3. Install backend dependencies:
   ```bash
   npm install
   ```

   This will install:
   - express
   - better-sqlite3
   - cors
   - multer
   - pdfkit
   - crypto (built-in, no install needed)

## Step 2: Install Frontend Dependencies

1. Open a **new** terminal/command prompt (keep the backend terminal open)
2. Navigate to the project root directory:
   ```bash
   cd ..
   ```
   (or navigate to the project root if you're starting fresh)

3. Install frontend dependencies:
   ```bash
   npm install
   ```

   This will install all React dependencies including:
   - react, react-dom
   - axios
   - react-router-dom
   - And all other UI dependencies

## Step 3: Start the Backend Server

1. In the backend terminal, run:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

2. You should see:
   ```
   Database initialized successfully
   Server is running on http://localhost:5000
   ```

3. The database (`database.sqlite`) will be automatically created in the `backend` folder

## Step 4: Start the Frontend Development Server

1. In the frontend terminal (project root), run:
   ```bash
   npm run dev
   ```

2. The frontend will start on `http://localhost:5173` (or another port if 5173 is busy)

3. Open your browser and navigate to the URL shown in the terminal

## Default Login Credentials

After starting the backend, these default users are created:

- **Admin**: 
  - Email: `admin@gmail.com`
  - Password: `admin123`

- **Landlord**: 
  - Email: `landlord@blockrent.com`
  - Password: `landlord123`

- **Tenant**: 
  - Email: `tenant@blockrent.com`
  - Password: `tenant123`

## Troubleshooting

### Backend Issues

1. **Port 5000 already in use**:
   - Change the port in `backend/server.js`:
     ```javascript
     const PORT = process.env.PORT || 5001; // Change to 5001 or another port
     ```
   - Update `src/services/api.ts`:
     ```typescript
     const API_BASE_URL = 'http://localhost:5001/api'; // Match the new port
     ```

2. **Database errors**:
   - Delete `backend/database.sqlite` and restart the server
   - The database will be recreated with default users

3. **Module not found errors**:
   - Make sure you ran `npm install` in the backend directory
   - Delete `node_modules` and `package-lock.json`, then run `npm install` again

### Frontend Issues

1. **Cannot connect to backend**:
   - Make sure the backend is running on port 5000
   - Check browser console for CORS errors
   - Verify `API_BASE_URL` in `src/services/api.ts` matches your backend URL

2. **CSS import error**:
   - This should be fixed, but if you see it, make sure `@import` comes before `@tailwind` in `src/index.css`

3. **Build errors**:
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

## Project Structure

```
cozy-property-connect/
├── backend/
│   ├── routes/          # API route handlers
│   ├── database.js       # SQLite setup
│   ├── server.js        # Express server
│   ├── package.json     # Backend dependencies
│   └── database.sqlite  # SQLite database (created automatically)
├── src/
│   ├── services/        # API service (Axios)
│   ├── contexts/        # Auth context
│   ├── pages/           # React pages
│   └── components/      # React components
├── package.json         # Frontend dependencies
└── vite.config.ts       # Vite configuration
```

## Running Both Servers

You need **two terminals** running simultaneously:

**Terminal 1 (Backend):**
```bash
cd backend
npm start
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Both servers must be running for the application to work properly!

## Next Steps

1. Start both servers (backend and frontend)
2. Open the frontend URL in your browser
3. Login with `admin@gmail.com` / `admin123`
4. Explore the application!
