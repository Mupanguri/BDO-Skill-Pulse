import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// User operations
export const dbUsers = {
  create: (data: { email: string; password: string; department: string; isAdmin?: boolean }) =>
    prisma.user.create({ data }),
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),
  findAll: () => prisma.user.findMany(),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  update: (id: string, data: any) => prisma.user.update({ where: { id }, data }),
  delete: (id: string) => prisma.user.delete({ where: { id } })
};

// Session operations
export const dbSessions = {
  create: (data: any) => prisma.quizSession.create({ data }),
  findAll: () => prisma.quizSession.findMany({
    include: {
      responses: {
        include: { user: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  }),
  findById: (id: string) => prisma.quizSession.findUnique({
    where: { id },
    include: {
      responses: {
        include: { user: true },
        orderBy: { score: 'desc' }
      }
    }
  }),
  update: (id: string, data: any) => prisma.quizSession.update({
    where: { id },
    data
  }),
  findActive: () => prisma.quizSession.findFirst({
    where: { isActive: true }
  }),
  findByCreatedBy: (email: string) => prisma.quizSession.findMany({
    where: { createdBy: email },
    include: {
      responses: {
        include: { user: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  }),
  delete: (id: string) => prisma.quizSession.delete({ where: { id } })
};

// Response operations
export const dbResponses = {
  create: (data: any) => prisma.quizResponse.create({
    data,
    include: { user: true, session: true }
  }),
  findBySession: (sessionId: string) => prisma.quizResponse.findMany({
    where: { sessionId },
    include: { user: true }
  }),
  findByUser: (userId: string) => prisma.quizResponse.findMany({
    where: { userId },
    include: { session: true },
    orderBy: { completedAt: 'desc' }
  }),
  hasUserSubmitted: (sessionId: string, userId: string) =>
    prisma.quizResponse.findFirst({
      where: { sessionId, userId }
    }),
  findByUserAndSession: (userId: string, sessionId: string) =>
    prisma.quizResponse.findFirst({
      where: { userId, sessionId }
    }),
  delete: (id: string) => prisma.quizResponse.delete({ where: { id } })
};

// Password Reset operations
export const dbPasswordResets = {
  create: (data: any) => prisma.passwordReset.create({ data }),
  findByEmail: (userEmail: string) => prisma.passwordReset.findUnique({ where: { userEmail } }),
  update: (userEmail: string, data: any) => prisma.passwordReset.update({ where: { userEmail }, data }),
  delete: (userEmail: string) => prisma.passwordReset.delete({ where: { userEmail } })
};

// Admin Reset Request operations
export const dbAdminResetRequests = {
  create: (data: any) => prisma.adminResetRequest.create({ data }),
  findAll: () => prisma.adminResetRequest.findMany({ orderBy: { requestedAt: 'desc' } }),
  findById: (id: string) => prisma.adminResetRequest.findUnique({ where: { id } }),
  update: (id: string, data: any) => prisma.adminResetRequest.update({ where: { id }, data }),
  delete: (id: string) => prisma.adminResetRequest.delete({ where: { id } })
};

// Quiz Progress operations
export const dbQuizProgress = {
  create: (data: any) => prisma.quizProgress.create({ data }),
  findByUserAndSession: (userEmail: string, sessionId: string) => 
    prisma.quizProgress.findUnique({ where: { userEmail_sessionId: { userEmail, sessionId } } }),
  update: (userEmail: string, sessionId: string, data: any) => 
    prisma.quizProgress.update({ where: { userEmail_sessionId: { userEmail, sessionId } }, data }),
  delete: (userEmail: string, sessionId: string) => 
    prisma.quizProgress.delete({ where: { userEmail_sessionId: { userEmail, sessionId } } })
};

// User Session operations
export const dbUserSessions = {
  create: (data: any) => prisma.userSession.create({ data }),
  findByUserEmail: (userEmail: string) => prisma.userSession.findMany({ where: { userEmail } }),
  findBySessionToken: (sessionToken: string) => prisma.userSession.findFirst({ where: { sessionToken } }),
  findByRefreshToken: (refreshToken: string) => prisma.userSession.findFirst({ where: { refreshToken } }),
  update: (id: string, data: any) => prisma.userSession.update({ where: { id }, data }),
  delete: (id: string) => prisma.userSession.delete({ where: { id } }),
  deleteByUserEmail: (userEmail: string) => prisma.userSession.deleteMany({ where: { userEmail } }),
  deleteExpired: () => prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })
};

// Quiz Feedback operations
export const dbQuizFeedback = {
  create: (data: any) => prisma.quizFeedback.create({ data }),
  findByUserAndSession: (userEmail: string, sessionId: string) => 
    prisma.quizFeedback.findFirst({ where: { userEmail, sessionId } }),
  findBySession: (sessionId: string) => prisma.quizFeedback.findMany({ where: { sessionId } }),
  findAll: () => prisma.quizFeedback.findMany({ orderBy: { submittedAt: 'desc' } }),
  delete: (id: string) => prisma.quizFeedback.delete({ where: { id } })
};

// User Notification operations
export const dbUserNotifications = {
  create: (data: any) => prisma.userNotification.create({ data }),
  findByUser: (userEmail: string) => prisma.userNotification.findMany({ 
    where: { userEmail }, 
    orderBy: { timestamp: 'desc' } 
  }),
  findById: (id: string) => prisma.userNotification.findUnique({ where: { id } }),
  update: (id: string, data: any) => prisma.userNotification.update({ where: { id }, data }),
  delete: (id: string) => prisma.userNotification.delete({ where: { id } }),
  markAsRead: (id: string) => prisma.userNotification.update({ where: { id }, data: { read: true } }),
  deleteByUser: (userEmail: string) => prisma.userNotification.deleteMany({ where: { userEmail } })
};

// User Warning operations
export const dbUserWarnings = {
  create: (data: any) => prisma.userWarning.create({ data }),
  findByUser: (userEmail: string) => prisma.userWarning.findMany({ 
    where: { userEmail }, 
    orderBy: { timestamp: 'desc' } 
  }),
  findById: (id: string) => prisma.userWarning.findUnique({ where: { id } }),
  delete: (id: string) => prisma.userWarning.delete({ where: { id } }),
  deleteByUser: (userEmail: string) => prisma.userWarning.deleteMany({ where: { userEmail } })
};

// User Retake operations
export const dbUserRetakes = {
  create: (data: any) => prisma.userRetake.create({ data }),
  findByUserAndSession: (userEmail: string, sessionId: string) => 
    prisma.userRetake.findUnique({ where: { userEmail_sessionId: { userEmail, sessionId } } }),
  update: (userEmail: string, sessionId: string, data: any) => 
    prisma.userRetake.update({ where: { userEmail_sessionId: { userEmail, sessionId } }, data }),
  delete: (userEmail: string, sessionId: string) => 
    prisma.userRetake.delete({ where: { userEmail_sessionId: { userEmail, sessionId } } })
};

// Question Bank operations
export const dbQuestionBank = {
  create: (data: any) => prisma.questionBank.create({ data }),
  findAll: () => prisma.questionBank.findMany({ orderBy: { createdAt: 'desc' } }),
  findById: (id: string) => prisma.questionBank.findUnique({ where: { id } }),
  findByCategory: (category: string) => prisma.questionBank.findMany({ where: { category } }),
  findByDifficulty: (difficulty: string) => prisma.questionBank.findMany({ where: { difficulty } }),
  update: (id: string, data: any) => prisma.questionBank.update({ where: { id }, data }),
  delete: (id: string) => prisma.questionBank.delete({ where: { id } })
};

// Quiz Template operations
export const dbQuizTemplates = {
  create: (data: any) => prisma.quizTemplate.create({ data }),
  findAll: () => prisma.quizTemplate.findMany({ orderBy: { createdAt: 'desc' } }),
  findById: (id: string) => prisma.quizTemplate.findUnique({ where: { id } }),
  findByDepartment: (department: string) => prisma.quizTemplate.findMany({ where: { department } }),
  update: (id: string, data: any) => prisma.quizTemplate.update({ where: { id }, data }),
  delete: (id: string) => prisma.quizTemplate.delete({ where: { id } })
};

// Audit Log operations
export const dbAuditLogs = {
  create: (data: any) => prisma.auditLog.create({ data }),
  findAll: () => prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' } }),
  findByAdmin: (adminEmail: string) => prisma.auditLog.findMany({ where: { adminEmail } }),
  findByAction: (action: string) => prisma.auditLog.findMany({ where: { action } }),
  delete: (id: string) => prisma.auditLog.delete({ where: { id } })
};

// Question Analytics operations
export const dbQuestionAnalytics = {
  create: (data: any) => prisma.questionAnalytics.create({ data }),
  findBySession: (sessionId: string) => prisma.questionAnalytics.findMany({ where: { sessionId } }),
  findByQuestion: (sessionId: string, questionIndex: number) => 
    prisma.questionAnalytics.findUnique({ where: { sessionId_questionIndex: { sessionId, questionIndex } } }),
  update: (sessionId: string, questionIndex: number, data: any) => 
    prisma.questionAnalytics.update({ where: { sessionId_questionIndex: { sessionId, questionIndex } }, data }),
  delete: (sessionId: string, questionIndex: number) => 
    prisma.questionAnalytics.delete({ where: { sessionId_questionIndex: { sessionId, questionIndex } } })
};

// Department Analytics operations
export const dbDepartmentAnalytics = {
  create: (data: any) => prisma.departmentAnalytics.create({ data }),
  findByDepartment: (department: string) => prisma.departmentAnalytics.findMany({ 
    where: { department }, 
    orderBy: { date: 'desc' } 
  }),
  findByDate: (department: string, date: Date) => 
    prisma.departmentAnalytics.findUnique({ where: { department_date: { department, date } } }),
  update: (department: string, date: Date, data: any) => 
    prisma.departmentAnalytics.update({ where: { department_date: { department, date } }, data }),
  delete: (department: string, date: Date) => 
    prisma.departmentAnalytics.delete({ where: { department_date: { department, date } } })
};

// Database utilities
export const dbUtils = {
  // Get database statistics
  getStats: async () => {
    const [userCount, sessionCount, responseCount, feedbackCount] = await Promise.all([
      prisma.user.count(),
      prisma.quizSession.count(),
      prisma.quizResponse.count(),
      prisma.quizFeedback.count()
    ]);
    
    return {
      users: userCount,
      sessions: sessionCount,
      responses: responseCount,
      feedback: feedbackCount
    };
  },
  
  // Clean up expired sessions
  cleanupExpiredSessions: () => prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  
  // Get user statistics
  getUserStats: async (userEmail: string) => {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return null;
    
    const [responses, warnings, notifications] = await Promise.all([
      prisma.quizResponse.findMany({ where: { userId: user.id }, orderBy: { completedAt: 'desc' } }),
      prisma.userWarning.findMany({ where: { userEmail }, orderBy: { timestamp: 'desc' } }),
      prisma.userNotification.findMany({ where: { userEmail, read: false } })
    ]);
    
    return {
      user,
      responses,
      warnings,
      unreadNotifications: notifications.length,
      totalQuizzes: responses.length,
      averageScore: responses.length > 0 ? Math.round(responses.reduce((sum, r) => sum + r.score, 0) / responses.length) : 0
    };
  }
};
