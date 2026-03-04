# BDO Skills Pulse - Database Setup

This document provides instructions for setting up the PostgreSQL database for the BDO Skills Pulse application.

## Prerequisites

- PostgreSQL installed and running
- Node.js and npm installed
- Database server accessible at `postgresql://postgres:windows@localhost:5432/bdo_quiz_system`

## Database Initialization

### 1. Create the Database

First, create the database in PostgreSQL:

```sql
CREATE DATABASE bdo_quiz_system;
```

### 2. Initialize Tables and Sample Data

Run the database initialization script to create all necessary tables and insert sample data:

```bash
npm run init-db
```

This will:
- Create all 16 tables required by the application
- Add performance indexes for optimal query performance
- Insert a default admin user and sample department users
- Create a sample quiz session

### 3. Default Credentials

After initialization, you'll have the following default users:

**Admin User:**
- Email: `admin@bdo.co.zw`
- Password: `Admin2024!` (Change this in production!)

**Sample Department Users:**
- `tax@bdo.co.zw` / `Password123!`
- `audit@bdo.co.zw` / `Password123!`
- `consulting@bdo.co.zw` / `Password123!`
- `it@bdo.co.zw` / `Password123!`
- `finance@bdo.co.zw` / `Password123!`

## Database Tables

The system includes the following tables:

### Core Tables
- **User** - User accounts with profile management
- **QuizSession** - Quiz sessions and configurations
- **QuizResponse** - User quiz responses and scores

### Advanced Features
- **QuizFeedback** - User feedback on quizzes
- **UserNotification** - System notifications
- **UserWarning** - Performance warnings
- **UserRetake** - Retake tracking and cooldowns

### Analytics & Monitoring
- **QuestionAnalytics** - Per-question performance data
- **DepartmentAnalytics** - Department-level statistics
- **AuditLog** - Administrative actions logging

### Additional Features
- **PasswordReset** - Password reset tracking
- **AdminResetRequest** - Admin password reset requests
- **QuizProgress** - Auto-save quiz progress
- **UserSession** - JWT session management
- **QuestionBank** - Reusable question repository
- **QuizTemplate** - Quiz templates

## Environment Configuration

Set your database connection string in `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/bdo_quiz_system
```

For production, use SSL:

```env
DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require
```

## Running the Application

After database setup:

1. Start the server:
   ```bash
   npm run server
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Or run both together:
   ```bash
   npm run dev:full
   ```

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check firewall settings for port 5432

### Permission Issues
- Ensure the database user has CREATE TABLE permissions
- Verify the database exists and is accessible

### Missing Tables
- Re-run the initialization script: `npm run init-db`
- Check the console output for any errors

## Production Deployment

For production environments:

1. **Change Default Passwords**: Update all default user passwords
2. **Enable SSL**: Use SSL connection strings
3. **Backup Strategy**: Implement regular database backups
4. **Monitoring**: Set up database performance monitoring
5. **Security**: Restrict database access and use strong passwords

## Database Schema

The complete schema is defined in:
- `prisma/schema.prisma` - Prisma ORM schema
- `create_tables.sql` - Raw SQL for table creation
- `init_database.js` - Initialization script

All tables include proper foreign key relationships, indexes for performance, and constraints for data integrity.