import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "staffpnl.notifs@gmail.com",
    pass: process.env.EMAIL_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!process.env.EMAIL_PASSWORD) {
    console.warn("Email not configured: EMAIL_PASSWORD secret not set");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Grovefan Staff Panel" <${process.env.EMAIL_USER || "staffpnl.notifs@gmail.com"}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendAccessApprovedEmail(email: string, username: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Access Request Approved - Grovefan Staff Panel",
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; padding: 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ffffff; margin: 0;">Grovefan Staff Panel</h1>
        </div>
        <div style="background: #18181b; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
          <h2 style="color: #22c55e; margin-top: 0;">Access Approved!</h2>
          <p style="color: #a1a1aa;">Hello <strong style="color: #ffffff;">${username}</strong>,</p>
          <p style="color: #a1a1aa;">Your access request to the Grovefan Staff Panel has been approved. You can now log in with your credentials.</p>
          <p style="color: #a1a1aa; margin-bottom: 0;">Welcome to the team!</p>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          This is an automated message from Grovefan Staff Panel.
        </p>
      </div>
    `,
  });
}

export async function sendAccessRejectedEmail(email: string, username: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "Access Request Update - Grovefan Staff Panel",
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; padding: 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ffffff; margin: 0;">Grovefan Staff Panel</h1>
        </div>
        <div style="background: #18181b; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
          <h2 style="color: #ef4444; margin-top: 0;">Access Request Update</h2>
          <p style="color: #a1a1aa;">Hello <strong style="color: #ffffff;">${username}</strong>,</p>
          <p style="color: #a1a1aa;">Unfortunately, your access request to the Grovefan Staff Panel was not approved at this time.</p>
          <p style="color: #a1a1aa; margin-bottom: 0;">If you believe this is an error, please contact the administrator.</p>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          This is an automated message from Grovefan Staff Panel.
        </p>
      </div>
    `,
  });
}

export async function sendTaskAssignedEmail(
  email: string,
  username: string,
  taskTitle: string,
  taskDescription: string,
  dueDate: string | null
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `New Task Assigned: ${taskTitle} - Grovefan Staff Panel`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; padding: 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ffffff; margin: 0;">Grovefan Staff Panel</h1>
        </div>
        <div style="background: #18181b; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
          <h2 style="color: #3b82f6; margin-top: 0;">New Task Assigned</h2>
          <p style="color: #a1a1aa;">Hello <strong style="color: #ffffff;">${username}</strong>,</p>
          <p style="color: #a1a1aa;">A new task has been assigned to you:</p>
          <div style="background: #27272a; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <h3 style="color: #ffffff; margin: 0 0 8px 0;">${taskTitle}</h3>
            <p style="color: #a1a1aa; margin: 0;">${taskDescription || "No description provided."}</p>
            ${dueDate ? `<p style="color: #f59e0b; margin: 8px 0 0 0;">Due: ${new Date(dueDate).toLocaleDateString()}</p>` : ""}
          </div>
          <p style="color: #a1a1aa; margin-bottom: 0;">Please log in to the Staff Panel to view and update the task.</p>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          This is an automated message from Grovefan Staff Panel.
        </p>
      </div>
    `,
  });
}

export async function sendReportSubmittedEmail(
  adminEmail: string,
  submitterName: string,
  reportTitle: string,
  reportContent: string
): Promise<boolean> {
  return sendEmail({
    to: adminEmail,
    subject: `New Work Report: ${reportTitle} - Grovefan Staff Panel`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; padding: 32px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ffffff; margin: 0;">Grovefan Staff Panel</h1>
        </div>
        <div style="background: #18181b; padding: 24px; border-radius: 8px; border: 1px solid #27272a;">
          <h2 style="color: #8b5cf6; margin-top: 0;">New Work Report Submitted</h2>
          <p style="color: #a1a1aa;"><strong style="color: #ffffff;">${submitterName}</strong> has submitted a new work report:</p>
          <div style="background: #27272a; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <h3 style="color: #ffffff; margin: 0 0 8px 0;">${reportTitle}</h3>
            <p style="color: #a1a1aa; margin: 0; white-space: pre-wrap;">${reportContent.substring(0, 500)}${reportContent.length > 500 ? "..." : ""}</p>
          </div>
          <p style="color: #a1a1aa; margin-bottom: 0;">Please log in to the Staff Panel to review this report.</p>
        </div>
        <p style="color: #52525b; font-size: 12px; text-align: center; margin-top: 24px;">
          This is an automated message from Grovefan Staff Panel.
        </p>
      </div>
    `,
  });
}
