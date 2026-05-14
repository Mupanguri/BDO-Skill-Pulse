import nodemailer from 'nodemailer'

let transporter = null

const getTransporter = () => {
  if (transporter) return transporter

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  })
  return transporter
}

export const sendQuizNotification = async (toEmails, quizName, createdBy, department) => {
  const t = getTransporter()
  if (!t || !toEmails.length) return

  const creatorName = createdBy.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const deptLabel = department === 'everyone' ? 'all staff' : `the ${department} department`

  const mailOptions = {
    from: process.env.SMTP_FROM || `"BDO Skills Pulse" <${process.env.SMTP_USER}>`,
    to: toEmails.join(', '),
    subject: `New Quiz Available: ${quizName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003087; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">BDO Skills Pulse</h1>
        </div>
        <div style="padding: 32px; background: #ffffff;">
          <h2 style="color: #003087; margin-top: 0;">New Quiz Published</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            <strong>${creatorName}</strong> has published a new quiz for ${deptLabel}:
          </p>
          <div style="background: #f5f5f5; border-left: 4px solid #e60026; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #003087; font-size: 16px;">${quizName}</strong>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            Please log in to your BDO Skills Pulse dashboard to complete this quiz within the stated time lines.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/app/dashboard"
               style="background: #e60026; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">
              Go to Dashboard
            </a>
          </div>
        </div>
        <div style="background: #f0f0f0; padding: 16px; text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            BDO Skills Pulse &bull; Confidential &bull; For BDO staff only
          </p>
        </div>
      </div>
    `
  }

  try {
    await t.sendMail(mailOptions)
  } catch (err) {
    console.error('[Mailer] Failed to send quiz notification:', err.message)
  }
}
