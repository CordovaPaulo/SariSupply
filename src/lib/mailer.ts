import nodemailer from 'nodemailer';

const fromEmail = process.env.MAILER_EMAIL || 'sarisupply@gmail.com';

export const mailer = nodemailer.createTransport({
  service: 'gmail',
  port: 465,
  secure: true,
  auth: {
    user: fromEmail,
    pass: process.env.MAILER_PASSWORD,
  },
});

// --- added: email styles used in HTML templates ---
const emailStyles = `
  /* Basic reset */
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; margin:0; padding:0; background:#f3f4f6; color:#0f172a; }
  .email-wrap { width:100%; padding:24px 12px; box-sizing:border-box; }
  .email-container { max-width:680px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 6px 18px rgba(15,23,42,0.08); }
  .email-header { background: linear-gradient(180deg,#ffcf76 0%, #f1b23d 100%); padding:18px 24px; color:#1f2937; display:flex; align-items:center; gap:12px; }
  .brand { font-weight:700; font-size:18px; color:#5b3b07; }
  .email-body { padding:20px 24px; line-height:1.5; color:#0f172a; }
  .greeting { margin:0 0 12px 0; font-size:15px; }
  .meta-list { list-style:none; padding:0; margin:8px 0 16px 0; }
  .meta-list li { padding:8px 0; border-bottom:1px dashed #e6e6e6; display:flex; justify-content:space-between; gap:10px; }
  .meta-list li strong { color:#111827; }
  .badge { display:inline-block; padding:6px 10px; border-radius:999px; font-weight:600; font-size:12px; }
  .badge.low { background:#fef3c7; color:#92400e; border:1px solid rgba(249,115,22,0.08); }
  .badge.out { background:#fecaca; color:#7f1d1d; border:1px solid rgba(220,38,38,0.06); }
  .manage { display:inline-block; margin-top:14px; padding:10px 16px; background:#f1b23d; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; }
  .footer { padding:14px 24px; background:#fafafa; color:#6b7280; font-size:13px; text-align:center; }
  a { color:inherit; }
  @media (max-width:480px){ .email-container{ border-radius:8px; } .email-header{ padding:12px 16px } .email-body{ padding:16px } }
`;

// Inventory alerts
type InventoryStatus = 'low' | 'out';

interface InventoryAlertOptions {
  to: string;
  itemName: string;
  sku?: string;
  currentQty: number;
  threshold: number;
  status: InventoryStatus; // 'low' | 'out'
  manageUrl?: string;
}

export async function sendInventoryAlert(opts: InventoryAlertOptions) {
  const { to, itemName, sku, currentQty, threshold, status, manageUrl } = opts;

  const statusText = status === 'out' ? 'Out of Stock' : 'Low Stock';
  const subject = `[Inventory Alert] ${itemName} — ${statusText}`;

  const text = `Hello,

This is an automated inventory alert.

Item: ${itemName}${sku ? ` (SKU: ${sku})` : ''}
Status: ${statusText}
Current quantity: ${currentQty}
Low-stock threshold: ${threshold}
${manageUrl ? `Manage: ${manageUrl}` : ''}

— SariSupply
`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>${emailStyles}</style>
  </head>
  <body>
    <div class="email-wrap">
      <div class="email-container">
        <div class="email-header">
          <div class="brand">SariSupply</div>
          <div style="margin-left:auto;font-size:13px;color:#4b5563">Inventory Alert</div>
        </div>
        <div class="email-body">
          <p class="greeting">Hello,</p>
          <p>This is an automated inventory alert for an item processed in a recent checkout.</p>

          <ul class="meta-list">
            <li><span><strong>Item: </strong></span><span>${itemName}${sku ? ` (SKU: ${sku})` : ''}</span></li>
            <li><span><strong>Status: </strong></span><span><span class="badge ${status === 'out' ? 'out' : 'low'}">${statusText}</span></span></li>
            <li><span><strong>Current quantity: </strong></span><span>${currentQty}</span></li>
            <li><span><strong>Low-stock threshold: </strong></span><span>${threshold}</span></li>
          </ul>

          ${manageUrl ? `<a class="manage" href="${manageUrl}">Manage this item</a>` : ''}
        </div>

        <div class="footer">
          This is an automated message from SariSupply. Please do not reply to this email.
        </div>
      </div>
    </div>
  </body>
</html>
`;

  await mailer.sendMail({
    from: `SariSupply <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

// Admin-created user notification
interface UserCreatedOptions {
  to: string;
  firstName?: string;
  username: string;
  tempPassword: string;
  loginUrl: string;
}

export async function sendUserCreatedEmail(opts: UserCreatedOptions) {
  const { to, firstName, username, tempPassword, loginUrl } = opts;

  const subject = 'Your SariSupply account has been created';
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';

  const text = `${greeting}

An administrator created your SariSupply account.

Username: ${username}
Temporary password: ${tempPassword}
Login: ${loginUrl}

For security, please sign in and change your password immediately.
— SariSupply
`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>${emailStyles}</style>
  </head>
  <body>
    <div class="email-wrap">
      <div class="email-container">
        <div class="email-header">
          <div class="brand">SariSupply</div>
          <div style="margin-left:auto;font-size:13px;color:#4b5563">Account Notice</div>
        </div>
        <div class="email-body">
          <p class="greeting">${greeting}</p>
          <p>An administrator created your SariSupply account. For security, sign in and change your password immediately.</p>

          <ul class="meta-list">
            <li><span><strong>Username</strong></span><span>${username}</span></li>
            <li><span><strong>Temporary password</strong></span><span>${tempPassword}</span></li>
          </ul>

          <a class="manage" href="${loginUrl}">Sign in to SariSupply</a>
        </div>

        <div class="footer">
          If you did not expect this, contact your administrator. — SariSupply
        </div>
      </div>
    </div>
  </body>
</html>
`;

  await mailer.sendMail({
    from: `SariSupply <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

export async function verifyMailer() {
  return mailer.verify();
}
