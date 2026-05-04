const nodemailer = require('nodemailer');

/**
 * Creates an SMTP transporter from environment variables.
 * Returns null when SMTP credentials are absent so the dev fallback can kick in.
 */
const createTransporter = () => {
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    // port 465 uses implicit TLS; everything else uses STARTTLS
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

/**
 * Sends an email.
 *
 * In development, if SMTP credentials are not configured, the email is printed
 * to the console instead — no config needed to test the forgot-password flow.
 *
 * @param {{ to: string, subject: string, text?: string, html?: string }} options
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@skill-exchange.com';

  if (!transporter) {
    // Dev fallback — keeps the app runnable without SMTP credentials
    console.log('\n─────────── [EMAIL NOT SENT — no SMTP config] ───────────');
    console.log(`To:      ${to}`);
    console.log(`From:    ${from}`);
    console.log(`Subject: ${subject}`);
    console.log('─'.repeat(57));
    console.log(text || html);
    console.log('─'.repeat(57) + '\n');
    return;
  }

  await transporter.sendMail({ from, to, subject, text, html });
};

module.exports = sendEmail;
