# BDO Quiz System - Deployment Guide

This guide will help you deploy the BDO Quiz System to Vercel (frontend + backend API) with Supabase (PostgreSQL database).

## Prerequisites

1. **Node.js** installed (v18 or higher)
2. **Vercel account** - Sign up at https://vercel.com
3. **Supabase account** - Sign up at https://supabase.com
4. **Git** installed and project pushed to GitHub/GitLab

---

## Part 1: Set Up Supabase Database

### Step 1.1: Create a Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your:
   - **Project URL** (e.g., `https://xyzabc.supabase.co`)
   - **Database Password** (you set this when creating the project)

### Step 1.2: Run Database Migrations

1. In Supabase Dashboard, go to **SQL Editor**
2. Copy the contents from `prisma/migrations/20260227061258_init/migration.sql`
3. Run the SQL to create all tables

Or use Prisma with Supabase:

```bash
# Install Prisma CLI
npm install -g prisma

# Set environment variables
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"

# Push schema to database
npx prisma db push
```

---

## Part 2: Deploy Backend to Vercel

The project has both frontend and backend in one Vercel project.

### Step 2.1: Configure Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres` | Supabase connection string |
| `JWT_SECRET` | `your-secure-jwt-secret-key` | Secret for JWT tokens |
| `JWT_REFRESH_SECRET` | `your-secure-refresh-secret-key` | Secret for refresh tokens |
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `production` | Environment mode |

### Step 2.2: Deploy

1. Connect your GitHub repository to Vercel
2. Import the project
3. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: (leave empty or use `npm run build`)
   - **Output Directory**: (leave empty)
4. Deploy

---

## Part 3: Update Frontend API URLs

After deployment, update the frontend to point to your Vercel backend:

### Step 3.1: Find Your Vercel URL

Your backend will be at: `https://your-project.vercel.app`

### Step 3.2: Update API Calls

The frontend calls `http://localhost:3001` which won't work in production. You need to:

1. Create a `.env` file in the project root:
```env
VITE_API_URL=https://your-project.vercel.app
```

2. Or update the hardcoded URLs in the React components:
   - `src/routes/QuizPage.tsx`
   - `src/routes/AdminPage.tsx`
   - `src/routes/UserManagementPage.tsx`
   - `src/routes/ParticipantsPage.tsx`
   - etc.

Replace:
```javascript
fetch('http://localhost:3001/api/...')
```

With:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
fetch(`${API_URL}/api/...`)
```

---

## Part 4: Testing the Deployment

### Step 4.1: Test Database Connection

1. Go to your Vercel deployed site
2. Try to log in
3. Check Vercel function logs for any database connection errors

### Step 4.2: Test Authentication

1. Register a new user
2. Login with credentials
3. Check that JWT token is working

### Step 4.3: Test Quiz Functionality

1. As admin, create a quiz session
2. As user, take the quiz
3. Verify progress is saved (logout and resume)

---

## Troubleshooting

### CORS Errors
If you get CORS errors, ensure your server.js has proper CORS configuration:

```javascript
const cors = require('cors')
app.use(cors({
  origin: ['https://your-vercel-domain.vercel.app'],
  credentials: true
}))
```

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check Supabase project is not paused
- Ensure IP whitelisting allows Vercel IPs

### Session/Token Issues
- JWT is configured for 1 hour expiry
- Refresh tokens last 7 days
- Check JWT_SECRET environment variable is set

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                              │
│  ┌─────────────────────┐    ┌────────────────────────────┐ │
│  │     Frontend        │    │      Backend API          │ │
│  │   (React/Vite)     │────│    (Express.js)           │ │
│  │   port 5173        │    │    port 3001               │ │
│  └─────────────────────┘    └─────────────┬──────────────┘ │
│                                           │                 │
└───────────────────────────────────────────┼─────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────────┐
                              │       SUPABASE               │
                              │    (PostgreSQL)              │
                              │    Database                  │
                              └─────────────────────────────┘
```

---

## Current Configuration

- **JWT Access Token**: 1 hour expiry
- **JWT Refresh Token**: 7 days expiry
- **Session Timeout**: 60 minutes
- **Quiz Progress**: Stored in PostgreSQL (QuizProgress table)
- **User Data**: Stored in PostgreSQL (User table)
- **Quiz Sessions**: Stored in PostgreSQL (QuizSession table)

---

## Next Steps

1. Set up a custom domain in Vercel (optional)
2. Configure SSL certificates (automatic with Vercel)
3. Set up email notifications for password reset
4. Configure backup for Supabase database

For any issues, check the logs in:
- Vercel Dashboard → Functions → Logs
- Supabase Dashboard → Logs
