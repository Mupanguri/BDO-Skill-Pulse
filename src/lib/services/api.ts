// Centralized API configuration
// Use VITE_API_URL env var for external API (e.g., Render)
// Fall back to empty string for same-domain deployment
// @ts-ignore - VITE_* env vars are available in Vite
const API_BASE_URL = (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_URL : '') || '';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/login`,
  REGISTER: `${API_BASE_URL}/api/register`,
  LOGOUT: `${API_BASE_URL}/api/logout`,
  LOGOUT_ALL: `${API_BASE_URL}/api/logout-all`,
  REFRESH: `${API_BASE_URL}/api/refresh`,
  SESSION_STATUS: `${API_BASE_URL}/api/session-status`,
  
  // Users
  USERS: `${API_BASE_URL}/api/users`,
  USER_PROFILE: (email: string) => `${API_BASE_URL}/api/user/${email}/profile`,
  USER_PASSWORD: (email: string) => `${API_BASE_URL}/api/user/${email}/password`,
  USER_SUBMISSIONS: (email: string) => `${API_BASE_URL}/api/user/${email}/submissions`,
  USER_WARN: (email: string) => `${API_BASE_URL}/api/user/${email}/warn`,
  USER_ELEVATE: (email: string) => `${API_BASE_URL}/api/user/${email}/elevate`,
  USER_DEMOTE: (email: string) => `${API_BASE_URL}/api/user/${email}/demote`,
  USER_PROMOTE: (email: string) => `${API_BASE_URL}/api/user/${email}/promote`,
  USER_WARNINGS: (email: string) => `${API_BASE_URL}/api/user/${email}/warnings`,
  USER_RETAKE_STATUS: (email: string, sessionId: string) => `${API_BASE_URL}/api/user/${email}/session/${sessionId}/retake-status`,
  USER_START_RETAKE: (email: string, sessionId: string) => `${API_BASE_URL}/api/user/${email}/session/${sessionId}/start-retake`,
  USER_COMPLETE_RETAKE: (email: string, sessionId: string) => `${API_BASE_URL}/api/user/${email}/session/${sessionId}/complete-retake`,
  
  // Sessions
  SESSIONS: `${API_BASE_URL}/api/sessions`,
  SESSION: (id: string) => `${API_BASE_URL}/api/sessions/${id}`,
  SESSION_WITH_USER: (id: string, userEmail: string) => `${API_BASE_URL}/api/sessions/${id}?userEmail=${userEmail}`,
  
  // Responses
  RESPONSES: `${API_BASE_URL}/api/responses`,
  
  // Quiz Progress
  QUIZ_PROGRESS: (email: string, sessionId: string) => `${API_BASE_URL}/api/quiz-progress/${email}/${sessionId}`,
  QUIZ_PROGRESS_SAVE: `${API_BASE_URL}/api/quiz-progress`,
  
  // Feedback
  FEEDBACK_CHECK: (email: string, sessionId: string) => `${API_BASE_URL}/api/feedback/check/${email}/${sessionId}`,
  FEEDBACK: `${API_BASE_URL}/api/feedback`,
  
  // Analytics
  ANALYTICS: (timeRange: string) => `${API_BASE_URL}/api/analytics?timeRange=${timeRange}`,
  
  // Audit
  AUDIT_LOGS: `${API_BASE_URL}/api/audit/logs`,
  
  // Notifications
  NOTIFICATIONS: (email: string) => `${API_BASE_URL}/api/user/${email}/notifications`,
  NOTIFICATION_READ: (email: string, notificationId: string) => `${API_BASE_URL}/api/user/${email}/notifications/${notificationId}/read`,
  DEPARTMENT_NOTIFICATIONS: (department: string) => `${API_BASE_URL}/api/department/${department}/notifications`,
  
  // Password Reset
  PASSWORD_RESET_CHECK: (email: string) => `${API_BASE_URL}/api/password-reset/check/${email}`,
  PASSWORD_RESET: `${API_BASE_URL}/api/password-reset/reset`,
  PASSWORD_RESET_CONTACT_ADMIN: `${API_BASE_URL}/api/password-reset/contact-admin`,
  
  // Logs
  LOGS: `${API_BASE_URL}/api/logs`,
  LOGS_CLEAR: `${API_BASE_URL}/api/logs/clear`,
};

// Helper function to get auth headers
export const getAuthHeaders = (accessToken: string | null) => ({
  'Content-Type': 'application/json',
  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
});

export default API_ENDPOINTS;

