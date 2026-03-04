-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "profileImage" TEXT,
    "lastPasswordChange" TIMESTAMP(3),
    "displayName" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "questions" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "resetCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyCount" INTEGER NOT NULL DEFAULT 0,
    "lastReset" TIMESTAMP(3),
    "monthlyResetDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminResetRequest" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,

    CONSTRAINT "AdminResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizProgress" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "timeRemaining" INTEGER NOT NULL DEFAULT 300,
    "lastSaved" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizFeedback" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "adminEmail" TEXT,
    "quizName" TEXT,
    "departmentName" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWarning" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "quizName" TEXT,
    "reason" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRetake" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "canRetake" BOOLEAN NOT NULL DEFAULT false,
    "lastAttempt" TIMESTAMP(3),

    CONSTRAINT "UserRetake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'multiple-choice',
    "options" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "category" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT,
    "questionIds" TEXT NOT NULL DEFAULT '[]',
    "timeLimit" INTEGER NOT NULL DEFAULT 300,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAnalytics" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentAnalytics" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalQuizzes" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION,
    "passRate" DOUBLE PRECISION,
    "topPerformers" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_userEmail_key" ON "PasswordReset"("userEmail");

-- CreateIndex
CREATE UNIQUE INDEX "QuizProgress_userEmail_sessionId_key" ON "QuizProgress"("userEmail", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRetake_userEmail_sessionId_key" ON "UserRetake"("userEmail", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAnalytics_sessionId_questionIndex_key" ON "QuestionAnalytics"("sessionId", "questionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentAnalytics_department_date_key" ON "DepartmentAnalytics"("department", "date");

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
