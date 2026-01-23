# Troubleshooting Guide - Website Not Showing

## Quick Checks

### 1. **Backend Server Status**
Make sure the backend server is running:
```bash
cd backend
node server.js
```
The backend should be running on `http://localhost:5000`

### 2. **Frontend Server Status**
Make sure the frontend dev server is running:
```bash
npm run dev
```
The frontend should be running on `http://localhost:8080` (or the port shown in terminal)

### 3. **Browser Console Errors**
Open browser DevTools (F12) and check:
- **Console tab**: Look for any red error messages
- **Network tab**: Check if API requests are failing (should see requests to `http://localhost:5000/api/...`)

### 4. **Common Issues**

#### Issue: Blank White Page
**Possible Causes:**
- Backend server not running
- CORS errors in browser console
- JavaScript errors preventing render
- API connection issues

**Solutions:**
1. Check browser console for errors
2. Verify backend is running on port 5000
3. Check if `http://localhost:5000/api/properties` returns data
4. Clear browser cache and localStorage
5. Try incognito/private browsing mode

#### Issue: "Cannot find module" errors
**Solution:**
```bash
npm install
cd backend
npm install
```

#### Issue: Properties not showing
**Possible Causes:**
- No properties in database
- Properties filtered out by search/filters
- API connection issue

**Solutions:**
1. Check backend logs for property count
2. Try clearing all filters on Properties page
3. Verify database has properties with status='approved'

### 5. **Database Check**
Verify database is initialized:
```bash
cd backend
node verify-database.js
```

### 6. **Port Conflicts**
If ports 5000 or 8080 are in use:
- Backend: Edit `backend/server.js` to change port
- Frontend: Edit `vite.config.ts` to change port

## Testing Checklist

- [ ] Backend server running (`http://localhost:5000`)
- [ ] Frontend server running (`http://localhost:8080`)
- [ ] No errors in browser console
- [ ] Can access homepage (`http://localhost:8080/`)
- [ ] Can access login page (`http://localhost:8080/login`)
- [ ] Can see properties page (`http://localhost:8080/properties`)
- [ ] API calls working (check Network tab)

## Still Not Working?

1. **Check terminal output** for both frontend and backend
2. **Check browser console** for specific error messages
3. **Verify all dependencies installed**: `npm install` in both root and backend
4. **Restart both servers** completely
5. **Check firewall/antivirus** isn't blocking localhost connections
