const { PrismaClient } = require('@prisma/client')
const { PrismaLibSql } = require('@prisma/adapter-libsql')
const { createClient } = require('@libsql/client')
const bcrypt = require('bcrypt')
const path = require('path')

const libsql = createClient({
  url: `file:${path.join(__dirname, 'dev.db')}`
})

const adapter = new PrismaLibSql(libsql)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Starting database seed...')

  // Clear existing data
  console.log('Clearing existing data...')
  await prisma.quizResponse.deleteMany()
  await prisma.quizSession.deleteMany()
  await prisma.user.deleteMany()
  await prisma.passwordReset.deleteMany()
  await prisma.adminResetRequest.deleteMany()
  await prisma.quizProgress.deleteMany()
  await prisma.userSession.deleteMany()
  await prisma.quizFeedback.deleteMany()
  await prisma.userNotification.deleteMany()
  await prisma.userWarning.deleteMany()
  await prisma.userRetake.deleteMany()
  await prisma.questionBank.deleteMany()
  await prisma.quizTemplate.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.questionAnalytics.deleteMany()
  await prisma.departmentAnalytics.deleteMany()

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('Password123!', 10)

  // Create Users
  console.log('Creating users...')
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bdo.co.zw',
      password: hashedPassword,
      department: 'IT',
      isAdmin: true,
    },
  })

  const taxUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@bdo.co.zw',
        password: hashedPassword,
        department: 'Tax',
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@bdo.co.zw',
        password: hashedPassword,
        department: 'Tax',
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'michael.jones@bdo.co.zw',
        password: hashedPassword,
        department: 'Tax',
        isAdmin: false,
      },
    }),
  ])

  const auditUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'sarah.wilson@bdo.co.zw',
        password: hashedPassword,
        department: 'Audit',
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'david.brown@bdo.co.zw',
        password: hashedPassword,
        department: 'Audit',
        isAdmin: false,
      },
    }),
  ])

  const consultingUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'emily.davis@bdo.co.zw',
        password: hashedPassword,
        department: 'Consulting',
        isAdmin: false,
      },
    }),
  ])

  console.log(`✓ Created ${1 + taxUsers.length + auditUsers.length + consultingUsers.length} users`)

  // Create Quiz Sessions
  console.log('Creating quiz sessions...')

  const taxQuiz = await prisma.quizSession.create({
    data: {
      name: 'Q1 2024 Tax Fundamentals',
      date: new Date('2024-03-15'),
      time: '300',
      questions: JSON.stringify([
        {
          id: '1',
          text: 'What is the current VAT rate in Zimbabwe?',
          options: ['14.5%', '15%', '16%', '17.5%'],
          correctAnswer: 0,
          type: 'multiple-choice',
        },
        {
          id: '2',
          text: 'Which form is used for corporate tax returns?',
          options: ['IT12', 'IT14', 'IT4', 'VAT7'],
          correctAnswer: 0,
          type: 'multiple-choice',
        },
        {
          id: '3',
          text: 'Are capital gains taxable in Zimbabwe?',
          options: ['True', 'False'],
          correctAnswer: 0,
          type: 'true-false',
        },
        {
          id: '4',
          text: 'What is the standard corporate tax rate?',
          options: ['24%', '25%', '26%', '30%'],
          correctAnswer: 1,
          type: 'multiple-choice',
        },
      ]),
      createdBy: admin.email,
      isActive: true,
    },
  })

  const auditQuiz = await prisma.quizSession.create({
    data: {
      name: 'Audit Standards & Procedures Q1 2024',
      date: new Date('2024-03-20'),
      time: '360',
      questions: JSON.stringify([
        {
          id: '1',
          text: 'What does ISA stand for?',
          options: ['International Standards on Auditing', 'Internal Standards on Auditing', 'Integrated Systems Audit', 'Internal Security Assessment'],
          correctAnswer: 0,
          type: 'multiple-choice',
        },
        {
          id: '2',
          text: 'Which ISA deals with audit documentation?',
          options: ['ISA 230', 'ISA 240', 'ISA 315', 'ISA 500'],
          correctAnswer: 0,
          type: 'multiple-choice',
        },
        {
          id: '3',
          text: 'Is audit evidence always conclusive?',
          options: ['True', 'False'],
          correctAnswer: 1,
          type: 'true-false',
        },
        {
          id: '4',
          text: 'What is materiality in auditing?',
          options: [
            'The physical documents used in an audit',
            'The threshold above which misstatements are significant',
            'The time taken to complete an audit',
            'The number of auditors assigned to a job'
          ],
          correctAnswer: 1,
          type: 'multiple-choice',
        },
      ]),
      createdBy: admin.email,
      isActive: true,
    },
  })

  const completedQuiz = await prisma.quizSession.create({
    data: {
      name: 'Tax Compliance Q4 2023',
      date: new Date('2023-12-10'),
      time: '300',
      questions: JSON.stringify([
        {
          id: '1',
          text: 'What is the deadline for filing individual tax returns?',
          options: ['31 March', '30 April', '31 May', '30 June'],
          correctAnswer: 0,
          type: 'multiple-choice',
        },
        {
          id: '2',
          text: 'Are dividends subject to withholding tax?',
          options: ['True', 'False'],
          correctAnswer: 0,
          type: 'true-false',
        },
        {
          id: '3',
          text: 'What is the penalty for late filing?',
          options: ['5%', '10%', '15%', '20%'],
          correctAnswer: 1,
          type: 'multiple-choice',
        },
      ]),
      createdBy: admin.email,
      isActive: false,
    },
  })

  console.log('✓ Created 3 quiz sessions')

  // Create Quiz Responses
  console.log('Creating quiz responses...')

  const responses = await Promise.all([
    // Tax users responses to completed quiz
    prisma.quizResponse.create({
      data: {
        sessionId: completedQuiz.id,
        userId: taxUsers[0].id,
        answers: JSON.stringify({ '0': 0, '1': 0, '2': 1 }),
        score: 100,
        timeSpent: 180,
        completedAt: new Date('2023-12-11'),
      },
    }),
    prisma.quizResponse.create({
      data: {
        sessionId: completedQuiz.id,
        userId: taxUsers[1].id,
        answers: JSON.stringify({ '0': 0, '1': 1, '2': 1 }),
        score: 67,
        timeSpent: 240,
        completedAt: new Date('2023-12-12'),
      },
    }),
    prisma.quizResponse.create({
      data: {
        sessionId: completedQuiz.id,
        userId: taxUsers[2].id,
        answers: JSON.stringify({ '0': 1, '1': 0, '2': 2 }),
        score: 33,
        timeSpent: 290,
        completedAt: new Date('2023-12-13'),
      },
    }),
    // Audit users responses
    prisma.quizResponse.create({
      data: {
        sessionId: completedQuiz.id,
        userId: auditUsers[0].id,
        answers: JSON.stringify({ '0': 0, '1': 0, '2': 1 }),
        score: 100,
        timeSpent: 150,
        completedAt: new Date('2023-12-11'),
      },
    }),
  ])

  console.log(`✓ Created ${responses.length} quiz responses`)

  // Create Question Bank
  console.log('Creating question bank...')

  const questions = await Promise.all([
    prisma.questionBank.create({
      data: {
        questionText: 'What is the basic principle of double-entry bookkeeping?',
        questionType: 'multiple-choice',
        options: JSON.stringify([
          'Every debit must have a corresponding credit',
          'Record transactions twice',
          'Use two different accounting systems',
          'Keep two sets of books'
        ]),
        correctAnswer: '0',
        category: 'Accounting',
        difficulty: 'easy',
        tags: JSON.stringify(['accounting', 'basics', 'bookkeeping']),
        createdBy: admin.email,
      },
    }),
    prisma.questionBank.create({
      data: {
        questionText: 'Is goodwill an intangible asset?',
        questionType: 'true-false',
        options: JSON.stringify(['True', 'False']),
        correctAnswer: '0',
        category: 'Financial Reporting',
        difficulty: 'medium',
        tags: JSON.stringify(['assets', 'financial-reporting', 'ifrs']),
        createdBy: admin.email,
      },
    }),
  ])

  console.log(`✓ Created ${questions.length} questions in question bank`)

  // Create Notifications
  console.log('Creating notifications...')

  const notifications = await Promise.all([
    prisma.userNotification.create({
      data: {
        userEmail: taxUsers[0].email,
        type: 'quiz_posted',
        title: 'New Quiz Available',
        message: 'ADMIN has posted a quiz for the Tax department to be completed within the stated time lines.',
        adminEmail: admin.email,
        quizName: taxQuiz.name,
        departmentName: 'Tax',
        read: false,
      },
    }),
    prisma.userNotification.create({
      data: {
        userEmail: auditUsers[0].email,
        type: 'quiz_posted',
        title: 'New Quiz Available',
        message: 'ADMIN has posted a quiz for the Audit department to be completed within the stated time lines.',
        adminEmail: admin.email,
        quizName: auditQuiz.name,
        departmentName: 'Audit',
        read: false,
      },
    }),
  ])

  console.log(`✓ Created ${notifications.length} notifications`)

  // Create Audit Logs
  console.log('Creating audit logs...')

  const logs = await Promise.all([
    prisma.auditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'create_quiz',
        details: JSON.stringify({
          quizName: taxQuiz.name,
          department: 'Tax',
          questionsCount: 4,
        }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    }),
    prisma.auditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'create_quiz',
        details: JSON.stringify({
          quizName: auditQuiz.name,
          department: 'Audit',
          questionsCount: 4,
        }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
    }),
  ])

  console.log(`✓ Created ${logs.length} audit logs`)

  console.log('\n✅ Database seeding completed successfully!')
  console.log('\n📋 Summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 Users created: 7 (1 admin, 6 regular users)')
  console.log('   - admin@bdo.co.zw (Admin - IT)')
  console.log('   - 3 Tax department users')
  console.log('   - 2 Audit department users')
  console.log('   - 1 Consulting department user')
  console.log('')
  console.log('📝 Quiz Sessions: 3')
  console.log('   - 2 Active quizzes (Tax & Audit)')
  console.log('   - 1 Completed quiz')
  console.log('')
  console.log('📊 Quiz Responses: 4')
  console.log('🔔 Notifications: 2')
  console.log('📚 Question Bank: 2 questions')
  console.log('📋 Audit Logs: 2')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n🔑 Login credentials for all users:')
  console.log('   Password: Password123!')
  console.log('\n💡 You can now login with any of the above emails!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
