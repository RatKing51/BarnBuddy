const { Resend } = require("resend");
const env = require("../config/env");

const resend = env.email.resendApiKey ? new Resend(env.email.resendApiKey) : null;

async function sendEmail({ to, subject, html, text }) {
  if (!env.email.enabled) {
    console.log(`[email disabled] Would send "${subject}" to ${to}`);
    return { skipped: true, reason: "EMAIL_ENABLED is not true" };
  }

  if (!resend) {
    throw new Error("RESEND_API_KEY is required when EMAIL_ENABLED=true");
  }

  return resend.emails.send({
    from: env.email.from,
    to,
    subject,
    html,
    text,
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendWelcomeEmail({ to, name }) {
  const safeName = escapeHtml(name || "there");
  const dashboardUrl = `${env.clientUrls[0].replace(/\/$/, "")}/dashboard`;

  return sendEmail({
    to,
    subject: "Welcome to BarnBuddy",
    text: `Welcome to BarnBuddy, ${name || "there"}! Your dashboard is ready: ${dashboardUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.6;">
        <h1 style="margin: 0 0 12px;">Welcome to BarnBuddy, ${safeName}</h1>
        <p>Your account is ready. You can start adding herds, animals, health records, vaccinations, and vet visits.</p>
        <p>
          <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
            Open your dashboard
          </a>
        </p>
        <p style="color: #5b667a; font-size: 14px;">You are receiving this because a BarnBuddy account was created with this email.</p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
};
