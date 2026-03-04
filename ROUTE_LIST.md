# BDO Skills Pulse - Complete Route List

## Frontend Routes (React Router)

### Base Routes (No Layout)
- `/` → Redirects to `/login`
- `/login` → LoginPage
- `/register` → RegisterPage  
- `/password-reset` → PasswordResetPage

### App Routes (With Layout) - All under `/app/`
- `/app/` → HomePage (Dashboard)
- `/app/dashboard` → DashboardPage (User dashboard)
- `/app/history` → HistoryPage (User quiz history)
- `/app/quiz/:sessionId` → QuizPage (Take quiz)
- `/app/admin` → AdminPage (Admin dashboard)
- `/app/admin/create` → CreateSessionPage (Create new quiz)
- `/app/admin/results` → ResultsPage (View quiz results)
- `/app/admin/participants` → ParticipantsPage (Manage users)
- `/app/admin/audit-logs` → AuditLogsPage (View admin actions)
- `/app/admin/analytics` → AnalyticsPage (View analytics)

### Redirect Routes (Legacy Support)
- `/results/:sessionId` → Redirects to `/app/admin/results?session=:sessionId`
- `/admin/results/:sessionId` → Redirects to `/app/admin/results?session=:sessionId`
- `/quiz/:sessionId` → Redirects to `/app/quiz/:sessionId`

## Backend API Routes (Express)

### Authentication
- `POST /api/register` → User registration
- `POST /api/login` → User login
- `POST /api/refresh` → Refresh access token
- `POST /api/logout` → Logout current session
- `POST /api/logout-all` → Logout all sessions
- `GET /api/session-status` → Check session validity

### Quiz Management
- `GET /api/sessions` → Get all quiz sessions
- `GET /api/sessions/:id` → Get specific session with responses
- `POST /api/sessions` → Create new quiz session
- `PATCH /api/sessions/:id` → Update session
- `PATCH /api/sessions/:id/status` → Update session status
- `GET /api/sessions/active` → Get active sessions

### Quiz Responses
- `POST /api/responses` → Submit quiz response
- `POST /api/quiz-progress` → Auto-save quiz progress
- `GET /api/quiz-progress/:userEmail/:sessionId` → Get saved progress

### User Management
- `GET /api/users` → Get all users (admin only)
- `POST /api/user/:email/warn` → Add warning to user (admin only)
- `POST /api/user/:email/elevate` → Elevate user to admin (admin only)
- `GET /api/user/:email/submissions` → Get user's quiz submissions
- `GET /api/user/:email/session/:sessionId/submission` → Check if user submitted quiz
- `GET /api/user/:email/warnings` → Get user's warning status
- `GET /api/user/:email/notifications` → Get user's notifications
- `POST /api/user/:email/notifications` → Create notification for user
- `PATCH /api/user/:email/notifications/:notificationId/read` → Mark notification as read

### Department Management
- `POST /api/department/:department/notifications` → Send notification to department

### Feedback System
- `POST /api/feedback` → Submit quiz feedback
- `GET /api/feedback/check/:userEmail/:sessionId` → Check if feedback submitted
- `GET /api/feedback/admin` → Get all feedback (admin only)
- `GET /api/feedback/stats` → Get feedback statistics (admin only)

### Audit & Analytics
- `GET /api/audit/logs` → Get audit logs (admin only)
- `GET /api/analytics` → Get comprehensive analytics (admin only)
- `GET /api/analytics/summary` → Get quick summary analytics (admin only)

## Key Routing Issues Fixed

### ✅ Removed Duplicate Routes
- **Before**: Both `/admin` and `/app/admin` existed
- **After**: Only `/app/admin` exists, `/admin` redirects to `/app/admin`

### ✅ Fixed Results Page Access
- **Before**: Users couldn't access results properly
- **After**: Results page at `/app/admin/results?session=SESSION_ID`

### ✅ Proper Session Parameter Handling
- **Before**: Session ID handling was inconsistent
- **After**: Proper URL parameter parsing and error handling

## Current Working URLs

### For Admin Users
- Admin Dashboard: `http://localhost:3000/app/admin`
- Create Quiz: `http://localhost:3000/app/admin/create`
- View Results: `http://localhost:3000/app/admin/results?session=SESSION_ID`
- Manage Users: `http://localhost:3000/app/admin/participants`
- Audit Logs: `http://localhost:3000/app/admin/audit-logs`
- Analytics: `http://localhost:3000/app/admin/analytics`

### For Regular Users
- User Dashboard: `http://localhost:3000/app/dashboard`
- Quiz History: `http://localhost:3000/app/history`
- Take Quiz: `http://localhost:3000/app/quiz/SESSION_ID`

### Authentication
- Login: `http://localhost:3000/login`
- Register: `http://localhost:3000/register`
- Password Reset: `http://localhost:3000/password-reset`

## Admin Credentials
- **Username**: `admin@bdo.co.zw`
- **Password**: `admin123`

All routes now follow the consistent `/app/` pattern for the main application, with proper authentication and authorization checks in place.