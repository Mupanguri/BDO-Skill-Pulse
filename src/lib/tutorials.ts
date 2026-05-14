import type { TutorialStep } from './components/TutorialAssistant'

export const tutorials: Record<string, TutorialStep[]> = {

  // ── Login ──────────────────────────────────────────────
  login: [
    {
      title: 'Welcome to BDO Skills Pulse',
      message: "Hi! I'm your BDO Skills Pulse guide. This platform tracks training effectiveness and validates staff competencies across the firm."
    },
    {
      title: 'Logging In',
      message: 'Enter your BDO email and password. Tick "Keep me signed in" to stay logged in for 30 days on your personal device.'
    },
    {
      title: 'Portal Selection',
      message: "After logging in you'll choose your portal — User, Admin, or HR. Each portal shows different features based on your role."
    }
  ],

  // ── Portal Select ──────────────────────────────────────
  portal_select: [
    {
      title: 'Choose Your Portal',
      message: "Select which area of the system you'd like to enter. Each portal requires password verification for security."
    },
    {
      title: 'User Portal',
      message: 'Take quizzes, track your progress, and review your personal performance history.'
    },
    {
      title: 'Admin / HR Portal',
      message: 'Access quiz management, analytics, participant performance, and audit logs. Your password is required every time for security.'
    }
  ],

  // ── Dashboard (User) ───────────────────────────────────
  dashboard_user: [
    {
      title: 'Your Dashboard',
      message: "Welcome! This is your personal dashboard. Here you'll see all quiz sessions that have been assigned to you."
    },
    {
      title: 'Starting a Quiz',
      message: "Click 'Start Quiz' to begin a new session, or 'Resume Quiz' to continue from where you left off — your progress is always saved."
    },
    {
      title: 'Quiz Availability',
      message: 'Only quizzes assigned to your department will appear here. Contact your admin if you believe a quiz is missing.'
    },
    {
      title: 'Your History',
      message: "Use 'My History' in the sidebar to review your past results, scores, and performance trends over time."
    }
  ],

  // ── Quiz Page ──────────────────────────────────────────
  quiz: [
    {
      title: 'Quiz Started',
      message: "You're in the quiz! Read each question carefully. Your answers are not submitted until you reach the final page."
    },
    {
      title: 'Timer',
      message: 'The countdown timer is always visible. When it reaches zero, the quiz auto-submits with your current answers.'
    },
    {
      title: 'Taking a Break',
      message: "Need a pause? Click 'Request Break' — your timer pauses and resumes the moment you click 'Resume Quiz'. All answers are preserved."
    },
    {
      title: 'Fullscreen Mode',
      message: "Use the fullscreen button for a focused, PowerPoint-style presentation. Press Escape or click Resume to exit."
    },
    {
      title: 'Navigation',
      message: 'Use Next / Previous to move between questions, or jump directly using the question number buttons on the right side.'
    }
  ],

  // ── Results Page (User view) ───────────────────────────
  results_user: [
    {
      title: 'Your Results',
      message: 'Here you can see your quiz results. You can only view results for quizzes you personally completed.'
    },
    {
      title: 'Score Breakdown',
      message: "Your score is shown as a percentage. A passing grade is 45% and above. You'll see which questions you answered correctly."
    },
    {
      title: 'Feedback',
      message: "After reviewing your results, you'll be asked to rate the quiz. Your feedback is anonymous and helps improve training quality."
    }
  ],

  // ── Admin Dashboard ────────────────────────────────────
  admin_dashboard: [
    {
      title: 'Admin Dashboard',
      message: 'Welcome to the Admin area. Here you manage all quiz sessions you have created for your department.'
    },
    {
      title: 'Sessions',
      message: "Each session shows its status (Active/Inactive), how many participants have responded, and quick action buttons."
    },
    {
      title: 'Activate / Deactivate',
      message: "Use the Activate/Deactivate button to control whether staff can currently take a quiz. Only active sessions are visible to users."
    },
    {
      title: 'Viewing Results',
      message: "Click 'Results' on any session to see detailed analytics, individual scores, and performance breakdowns."
    },
    {
      title: 'Creating Sessions',
      message: "Use 'Create Session' in the sidebar or header to build a new quiz — add questions, set a time limit, and target a department."
    }
  ],

  // ── HR Dashboard ───────────────────────────────────────
  hr_dashboard: [
    {
      title: 'HR Portal',
      message: "Welcome to the HR Dashboard. As an HR administrator, you have full visibility into all sessions across every department."
    },
    {
      title: 'Firm-Wide View',
      message: "Unlike regular admins who only see their own quizzes, you can see and manage all sessions created by any admin in the firm."
    },
    {
      title: 'Analytics',
      message: "Access the Analytics page for enterprise-level insights including pass rates, risk indices, department comparisons, and trend analysis."
    },
    {
      title: 'Audit Trail',
      message: "Audit Logs give you a complete record of every admin action — session changes, user elevations, and system events."
    }
  ],

  // ── Analytics ─────────────────────────────────────────
  analytics: [
    {
      title: 'Analytics Dashboard',
      message: "This is your enterprise analytics hub. All metrics update based on the filters you select at the top."
    },
    {
      title: 'KPI Cards',
      message: "The five cards show key performance indicators — each includes a delta vs the prior period so you can track trends."
    },
    {
      title: 'Auto Insights',
      message: 'The Insights panel automatically generates plain-English observations based on the data, flagging risks and positive trends.'
    },
    {
      title: 'Charts',
      message: 'The line chart shows performance over time, the histogram shows score distribution, and the radar compares departments.'
    },
    {
      title: 'Filters',
      message: 'Use the Time Range, Department, and Session dropdowns to drill into specific data slices. Hit Refresh to update all charts.'
    }
  ],

  // ── Participants ───────────────────────────────────────
  participants: [
    {
      title: 'Participants Overview',
      message: 'This page shows all staff and their performance grades across all quizzes they have taken.'
    },
    {
      title: 'Grade System',
      message: 'Distinction (70%+), Merit (60–69%), Pass (45–59%), Warning (30–44%), Fail (0–29%). Grades are based on average scores.'
    },
    {
      title: 'User Detail',
      message: "Click 'View' on any participant to see their full quiz history, performance stats, and take admin actions."
    },
    {
      title: 'Admin Actions',
      message: "From the detail modal, you can elevate a user to Admin (requires your password), remove admin access, or send a warning."
    },
    {
      title: 'Export',
      message: "Use 'Export CSV' to download the full participants list for reporting purposes."
    }
  ],

  // ── Results (Admin/HR view) ────────────────────────────
  results_admin: [
    {
      title: 'Results Dashboard',
      message: "Here you can view all submissions for any quiz session. Use the session dropdown to select which quiz to analyse."
    },
    {
      title: 'Individual Results',
      message: "Each row shows a participant's score, time taken, and completion date. Click to expand for question-by-question breakdown."
    },
    {
      title: 'Analytics Summary',
      message: 'The summary panel at the top shows aggregate stats — total responses, average score, and department breakdown.'
    },
    {
      title: 'Export',
      message: 'Download results as CSV for inclusion in reports or further analysis in Excel.'
    }
  ],

  // ── Audit Logs ─────────────────────────────────────────
  audit_logs: [
    {
      title: 'Audit Logs',
      message: "Every admin action is recorded here — who did what, when, and from which IP address. This is your compliance trail."
    },
    {
      title: 'Activity Tab',
      message: 'Use filters to search by action type, admin email, or date range. Click any row to expand full details.'
    },
    {
      title: 'Feedback Tab',
      message: "Switch to the Feedback tab to review anonymous quiz ratings. Scores are shown on a 0–10 scale (rating × 2)."
    },
    {
      title: 'Exporting',
      message: 'Both activity logs and feedback data can be downloaded as CSV. The super-admin lock icon requires the master password.'
    }
  ],

  // ── Create Session ────────────────────────────────────
  create_session: [
    {
      title: 'Create a Quiz Session',
      message: "Here you'll set up a new quiz. Give it a clear name that staff will recognise, and set the date and time."
    },
    {
      title: 'Target Department',
      message: 'Only staff in the selected department will see this quiz on their dashboard. Choose carefully before saving.'
    },
    {
      title: 'Time Limit',
      message: 'Set a time limit in minutes. The quiz auto-submits when time runs out. Allow enough time for thorough reading.'
    },
    {
      title: 'Adding Questions',
      message: "Add as many questions as needed. Each question can have multiple choice options — mark the correct answer for automatic scoring."
    },
    {
      title: 'Going Live',
      message: "Save the session first, then Activate it from the Admin Dashboard when you're ready for staff to begin."
    }
  ],

  // ── Profile ───────────────────────────────────────────
  profile: [
    {
      title: 'Your Profile',
      message: "This is your personal profile page. Other users see your display name and profile image in the system."
    },
    {
      title: 'Profile Image',
      message: 'Upload a profile photo by clicking the camera icon. Images are compressed automatically. A clear, professional photo is recommended.'
    },
    {
      title: 'Display Name',
      message: "Set your preferred display name — this appears in the sidebar and anywhere your name is shown in the system."
    }
  ],

  // ── User Management (SuperAdmin) ──────────────────────
  user_management: [
    {
      title: 'User Management',
      message: 'This panel gives you full control over all user accounts in the system. Proceed carefully — changes take effect immediately.'
    },
    {
      title: 'Creating Users',
      message: 'Add new staff accounts here. Set their department, role, and initial password. They can change their password after first login.'
    },
    {
      title: 'Roles',
      message: 'Regular users take quizzes. Admins create and manage sessions. HR users have firm-wide visibility. Super Admins manage accounts.'
    },
    {
      title: 'Editing & Deleting',
      message: 'Edit any account to change role or department. Deleting an account removes all associated quiz responses — this cannot be undone.'
    }
  ],

  // ── History ───────────────────────────────────────────
  history: [
    {
      title: 'Your History',
      message: "Here's a complete record of every quiz you've taken, including scores, dates, and whether you passed."
    },
    {
      title: 'Performance Trends',
      message: "Track how your scores change over time. Consistent improvement is the goal — speak to your admin if you need support."
    }
  ]
}
