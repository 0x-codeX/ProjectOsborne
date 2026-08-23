// server/utils/emailService.js
const nodemailer = require("nodemailer");

const transporter =
  nodemailer.createTransport(
    {
      service:
        "gmail", // Or SendGrid / AWS SES
      auth: {
        user: process
          .env
          .EMAIL_USER,
        pass: process
          .env
          .EMAIL_PASS,
      },
    },
  );

/**
 * Sends immediate action email to Accounts Dept for Crypto Creator Payouts
 */
exports.sendAccountsCryptoPayoutEmail =
  async ({
    creatorUsername,
    walletAddress,
    amountUSDT,
    requestId,
    approvedByAdmin,
  }) => {
    const mailOptions =
      {
        from: `"Nippy Security & Treasury" <${process.env.EMAIL_USER}>`,
        to:
          process
            .env
            .ACCOUNTS_EMAIL ||
          process
            .env
            .EMAIL_USER,
        subject: `🚨 [ACTION REQUIRED] Immediate Crypto Payout Approved - ${amountUSDT} USDT`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; rounded-radius: 10px;">
        <h2 style="color: #10b981;">Crypto Payout Authorized</h2>
        <p>A Web3 liquidation request has passed Super Admin approval and requires immediate token dispatch.</p>
        <hr style="border-color: #334155;" />
        <ul style="line-height: 1.8;">
          <li><strong>Clearing Ref ID:</strong> <code>${requestId}</code></li>
          <li><strong>Creator Username:</strong> ${creatorUsername}</li>
          <li><strong>Recipient Wallet (Polygon):</strong> <code style="color: #38bdf8;">${walletAddress}</code></li>
          <li><strong>Amount to Send:</strong> <strong style="color: #34d399; font-size: 16px;">${amountUSDT} USDT</strong></li>
          <li><strong>Authorized By Admin ID:</strong> ${approvedByAdmin}</li>
        </ul>
        <hr style="border-color: #334155;" />
        <p style="font-size: 11px; color: #94a3b8;">
          Please verify this reference ID in your Admin SystemLog before executing the transaction on-chain.
        </p>
      </div>
    `,
      };

    return transporter.sendMail(
      mailOptions,
    );
  };
