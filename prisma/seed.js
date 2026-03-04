import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminEmail = 'admin@bdo.co.zw'
  const adminPassword = 'Admin2024!' // Change this in production
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      department: 'Admin',
      isAdmin: true
    }
  })

  console.log(`Admin user created: ${adminUser.email}`)
  console.log(`Admin password: ${adminPassword} (Change this in production!)`)

  // Create sample departments
  const departments = ['Tax', 'Audit', 'Consulting', 'IT', 'Finance']
  
  for (const dept of departments) {
    await prisma.user.upsert({
      where: { email: `${dept.toLowerCase()}@bdo.co.zw` },
      update: {},
      create: {
        email: `${dept.toLowerCase()}@bdo.co.zw`,
        password: await bcrypt.hash('Password123!', 10),
        department: dept,
        isAdmin: false
      }
    })
    console.log(`Sample user created for ${dept} department`)
  }

  // Create sample quiz sessions
  const sampleSessions = [
    {
      name: 'Q1 2024 Tax Compliance Quiz',
      date: new Date('2024-03-15'),
      time: '10:00',
      questions: JSON.stringify([
        {
          id: 'q1',
          text: 'What is the current corporate tax rate in Zimbabwe?',
          options: ['25%', '30%', '35%', '40%'],
          correctAnswer: 1,
          type: 'multiple-choice'
        },
        {
          id: 'q2',
          text: 'Which of the following is considered a tax-deductible expense?',
          options: ['Personal travel costs', 'Business entertainment', 'Employee salaries', 'Dividends paid'],
          correctAnswer: 2,
          type: 'multiple-choice'
        },
        {
          id: 'q3',
          text: 'What is the VAT rate in Zimbabwe?',
          options: ['12%', '14%', '15%', '16%'],
          correctAnswer: 1,
          type: 'multiple-choice'
        }
      ]),
      createdBy: adminEmail,
      isActive: true
    },
    {
      name: 'Q2 2024 Audit Procedures Quiz',
      date: new Date('2024-06-20'),
      time: '14:00',
      questions: JSON.stringify([
        {
          id: 'q1',
          text: 'What is the primary objective of an audit?',
          options: ['To detect fraud', 'To express an opinion on financial statements', 'To prepare tax returns', 'To manage company finances'],
          correctAnswer: 1,
          type: 'multiple-choice'
        },
        {
          id: 'q2',
          text: 'Which of the following is a type of audit evidence?',
          options: ['Physical inspection', 'Reperformance', 'Observation', 'All of the above'],
          correctAnswer: 3,
          type: 'multiple-choice'
        }
      ]),
      createdBy: adminEmail,
      isActive: false
    }
  ]

  for (const sessionData of sampleSessions) {
    await prisma.quizSession.create({
      data: sessionData
    })
    console.log(`Sample session created: ${sessionData.name}`)
  }

  console.log('Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })