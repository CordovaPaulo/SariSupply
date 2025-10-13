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

  const html = `<p>Hello,</p>
<p>This is an automated inventory alert.</p>
<ul>
  <li><strong>Item:</strong> ${itemName}${sku ? ` (SKU: ${sku})` : ''}</li>
  <li><strong>Status:</strong> ${statusText}</li>
  <li><strong>Current quantity:</strong> ${currentQty}</li>
  <li><strong>Low-stock threshold:</strong> ${threshold}</li>
</ul>
${manageUrl ? `<p><a href="${manageUrl}">Manage this item</a></p>` : ''}
<p>— SariSupply</p>`;

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

  const html = `<p>${greeting}</p>
<p>An administrator created your SariSupply account.</p>
<ul>
  <li><strong>Username:</strong> ${username}</li>
  <li><strong>Temporary password:</strong> ${tempPassword}</li>
</ul>
<p><a href="${loginUrl}">Sign in</a> and change your password immediately.</p>
<p>— SariSupply</p>`;

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
