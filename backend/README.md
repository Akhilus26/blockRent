# Cozy Property Connect - Backend

Express.js backend server with SQLite database for the Cozy Property Connect application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## Database

The SQLite database (`database.sqlite`) will be automatically created on first run with the following default users:

- **Admin**: admin@gmail.com / admin123
- **Landlord**: landlord@blockrent.com / landlord123
- **Tenant**: tenant@blockrent.com / tenant123

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile

### Properties
- `GET /api/properties` - Get all properties (optional query: ?status=approved)
- `GET /api/properties/:id` - Get property by ID
- `POST /api/properties` - Create new property (requires landlord/admin)
- `DELETE /api/properties/:id` - Delete property (requires owner/admin)

### Requests
- `POST /api/requests` - Create rental request (requires tenant)
- `GET /api/requests/user` - Get user's requests (requires tenant)
- `GET /api/requests/landlord` - Get landlord's requests (requires landlord)
- `PATCH /api/requests/:id/respond` - Respond to request (requires landlord)

### Agreements
- `POST /api/agreements/finalize` - Finalize agreement (requires tenant/landlord)
- `GET /api/agreements/user` - Get user's agreements (requires tenant)
- `GET /api/agreements/landlord` - Get landlord's agreements (requires landlord)
- `GET /api/agreements/:id/hash` - Get agreement blockchain hash

## Authentication

This backend uses simple mock authentication (no JWT). The frontend sends the user ID in the `x-user-id` header after storing it in localStorage after login.

## Notes

- All passwords are hashed using SHA-256
- Blockchain hashes are generated using SHA-256
- PDF agreements are stored in the `uploads/` directory
- The database is automatically initialized on first run
