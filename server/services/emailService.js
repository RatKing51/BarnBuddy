const { Resend } = require("resend");
const env = require("../config/env");

const resend = env.email.resendApiKey ? new Resend(env.email.resendApiKey) : null;

async function sendEmail({ to, subject, html, text, from }) {
  if (!env.email.enabled) {
    console.log(`[email disabled] Would send "${subject}" to ${to}`);
    return { skipped: true, reason: "EMAIL_ENABLED is not true" };
  }

  if (!resend) {
    throw new Error("RESEND_API_KEY is required when EMAIL_ENABLED=true");
  }

  return resend.emails.send({
    from: from || env.email.from,
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

async function sendContactEmail({ name, email, topic, message }) {
  if (!env.email.contactTo) {
    throw new Error("CONTACT_TO_EMAIL is required to receive contact form messages.");
  }

  const safeName = escapeHtml(name || "BarnBuddy visitor");
  const safeEmail = escapeHtml(email || "No email provided");
  const safeTopic = escapeHtml(topic || "General question");
  const safeMessage = escapeHtml(message || "").replace(/\n/g, "<br />");

  return sendEmail({
    to: env.email.contactTo,
    subject: `BarnBuddy contact: ${topic || "General question"}`,
    text: [
      `Name: ${name || "BarnBuddy visitor"}`,
      `Email: ${email || "No email provided"}`,
      `Topic: ${topic || "General question"}`,
      "",
      message || "",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.6;">
        <h1 style="margin: 0 0 12px;">New BarnBuddy contact message</h1>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Topic:</strong> ${safeTopic}</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 18px 0;" />
        <p>${safeMessage}</p>
      </div>
    `,
  });
}

async function sendTestEmail({ to, requestedBy }) {
  const safeRequestedBy = escapeHtml(requestedBy || to);
  const sentAt = new Date().toISOString();

  return sendEmail({
    to,
    subject: "BarnBuddy Resend test email",
    text: `This is a BarnBuddy test email requested by ${requestedBy || to} at ${sentAt}.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #172033; line-height: 1.6;">
        <h1 style="margin: 0 0 12px;">BarnBuddy email test</h1>
        <p>Resend is connected and BarnBuddy can send email.</p>
        <p><strong>Requested by:</strong> ${safeRequestedBy}</p>
        <p><strong>Sent at:</strong> ${sentAt}</p>
      </div>
    `,
  });
}

module.exports = {
  sendEmail,
  sendContactEmail,
  sendTestEmail,
  sendWelcomeEmail,
  escapeHtml,
};
