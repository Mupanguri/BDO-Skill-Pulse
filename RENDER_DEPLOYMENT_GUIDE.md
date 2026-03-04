# Deploying BDO Quiz System Backend to Render

This guide covers deploying the Express.js backend to Render.com.

## Prerequisites
- GitHub account
- Supabase database already set up
- Vercel frontend deployed

## Step 1: Prepare server.js for Production

The backend is already configured to use Supabase PostgreSQL. Make sure your `DATABASE_URL` points to Supabase.

## Step 2: Create Render Account

1. Go to [Render](https://render.com)
2. Sign up with GitHub
3. Click "New +" and select "Web Service"

## Step 3: Connect GitHub Repository

1. Select your BDO-Skill-Pulse repository
2. Configure the settings:

**Settings:**
- **Name**: `bdo-quiz-api`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Plan**: `Free` (or paid for better performance)

## Step 4: Set Environment Variables

Add these environment variables in Render:

```
DATABASE_URL=postgresql://postgres:[password]@dpg-xxxxx.render.com/bdo_quiz_system?sslmode=require
JWT_SECRET=your-secure-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-secure-refresh-secret-min-32-chars
PORT=3001
NODE_ENV=production
```

**To get your Supabase DATABASE_URL:**
1. Go to Supabase Dashboard
2. Settings → Database
3. Copy the "Connection String" (URI)
4. Replace `[YOUR-PASSWORD]` with your actual password

## Step 5: Deploy

1. Click "Create Web Service"
2. Wait for deployment to complete (2-5 minutes)
3. Note your Render URL (e.g., `https://bdo-quiz-api.onrender.com`)

## Step 6: Update Vercel Frontend

1. Go to Vercel Dashboard → Your project → Settings → Environment Variables
2. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render URL (e.g., `https://bdo-quiz-api.onrender.com`)
3. Redeploy the frontend to apply the changes

## Step 7: Test the Application

1. Visit your Vercel frontend: `https://bdoskillpulse.vercel.app`
2. Try to login with admin credentials
3. The frontend will now connect to the Render backend

## Troubleshooting

### CORS Issues
If you see CORS errors, make sure the Render backend allows your Vercel domain:

The server.js already includes CORS configuration for `https://bdoskillpulse.vercel.app`.

### Database Connection
If the backend fails to start:
1. Check the Render logs
2. Verify DATABASE_URL is correct
3. Ensure Supabase allows connections from Render (usually automatic)

### First Request Delay
Render's free tier spins down after 15 minutes of inactivity. The first request may take 30-60 seconds to wake up the service.

## Security Notes

1. **JWT Secrets**: Use strong, random strings (at least 32 characters)
2. **Environment Variables**: Never commit secrets to GitHub
3. **Supabase**: Your database is already configured with row-level security

## Architecture Summary

```
┌─────────────────────────┐      ┌─────────────────────────┐
│   Vercel (Frontend)     │ ───► │   Render (Backend API)  │
│  bdoskillpulse.vercel  │      │  bdo-quiz-api.onrender  │
└─────────────────────────┘      └───────────┬─────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────────┐
                                    │   Supabase (Database)   │
                                    └─────────────────────────┘
```
