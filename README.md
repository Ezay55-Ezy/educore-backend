# 🎓 EduCore Backend API — Setup Guide

## What You Need Installed
- ✅ Node.js (you have this)
- ⬜ PostgreSQL → Download from: https://www.postgresql.org/download/windows/

---

## STEP 1 — Install PostgreSQL

1. Go to: https://www.postgresql.org/download/windows/
2. Download and install (remember the password you set for "postgres" user)
3. Open **pgAdmin** (installed with PostgreSQL) OR use the terminal

---

## STEP 2 — Create the Database

Open **pgAdmin** or the **SQL Shell (psql)** and run:
```sql
CREATE DATABASE educore_db;
```

Then run the schema file to create all tables:
```bash
psql -U postgres -d educore_db -f database/schema.sql
```

Or paste the contents of `database/schema.sql` into pgAdmin's query tool.

---

## STEP 3 — Configure Your Password

Open the `.env` file and change:
```
DB_PASSWORD=your_password_here
```
Replace `your_password_here` with the PostgreSQL password you set during install.

---

## STEP 4 — Install Node.js Packages

Open a terminal in this folder and run:
```bash
npm install
```

---

## STEP 5 — Start the Server

```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
╔══════════════════════════════════════╗
║   🎓 EduCore Backend API             ║
║   Running on https://educore-api.onrender.com/api   ║
╚══════════════════════════════════════╝
```

---

## STEP 6 — Test the API

Open your browser or use Postman to test:

### Test Login:
```
POST https://educore-api.onrender.com/api/auth/login
Body (JSON):
{
  "admission_no": "ADM-2024-001",
  "password": "password123"
}
```

Expected response:
```json
{
  "success": true,
  "message": "Welcome back, Amina!",
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "admission_no": "ADM-2024-001",
    "name": "Amina Ochieng",
    "role": "student"
  }
}
```

### Test Get Student Profile (use the token from login):
```
GET https://educore-api.onrender.com/api/students/1
Headers:
  Authorization: Bearer <your_token_here>
```

---

## API Endpoints Reference

| Method | Endpoint                      | Who Can Access      |
|--------|-------------------------------|---------------------|
| POST   | /api/auth/login               | Everyone            |
| GET    | /api/auth/me                  | Logged in users     |
| PUT    | /api/auth/change-password     | Logged in users     |
| GET    | /api/students                 | Admin / Teacher     |
| POST   | /api/students                 | Admin only          |
| GET    | /api/students/:id             | Own data / Admin    |
| PUT    | /api/students/:id             | Admin only          |
| GET    | /api/students/:id/attendance  | Own data / Admin    |
| GET    | /api/students/:id/fees        | Own data / Admin    |
| GET    | /api/students/:id/grades      | Own data / Admin    |

---

## Sample Login Credentials (from schema.sql)

| Admission No  | Password    | Name            |
|---------------|-------------|-----------------|
| ADM-2024-001  | password123 | Amina Ochieng   |
| ADM-2024-002  | password123 | Brian Kamau     |
| ADM-2024-003  | password123 | Esther Akinyi   |

---

## Folder Structure
```
educore-backend/
├── database/
│   └── schema.sql          ← Run this in PostgreSQL first
├── src/
│   ├── config/
│   │   └── database.js     ← Database connection
│   ├── controllers/
│   │   ├── authController.js    ← Login logic
│   │   └── studentController.js ← Student data logic
│   ├── middleware/
│   │   └── auth.js         ← Token verification
│   ├── routes/
│   │   ├── auth.js         ← /api/auth routes
│   │   └── students.js     ← /api/students routes
│   └── server.js           ← Main entry point
├── .env                    ← Your config (DB password etc.)
├── package.json
└── README.md               ← This file
```

---

## Next Steps After Backend is Running

1. ✅ Backend API running on https://educore-api.onrender.com/api
2. ⬜ Build Student Login page (HTML/Angular)
3. ⬜ Build Student Dashboard (shows real data from API)
4. ⬜ Add Teacher module
5. ⬜ Add M-Pesa fee payment integration
6. ⬜ Deploy to cloud (Render.com — free)
