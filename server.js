const express = require('express');
const cors = require('cors');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email sending endpoint
app.post('/api/send-order-confirmation', async (req, res) => {
  try {
    const {
      recipientEmail,
      recipientName,
      orderNumber,
      firstName,
      lastName,
      senderName,
      senderEmail,
      senderDomain,
      customMessage,
      images
    } = req.body;

    if (!recipientEmail || !orderNumber || !firstName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: 'Invalid recipient email' });
    }

    // ─────────────────────────────
    // Build CID attachments + HTML
    // ─────────────────────────────
    let imageHtml = '';
    const attachments = [];

    if (Array.isArray(images) && images.length > 0) {
      imageHtml += '<div class="images-container">';

      images.forEach((img, index) => {
        const cid = `image${index + 1}`;

        attachments.push({
          content: img.content,      // BASE64 ONLY
          type: img.type,            // image/png
          filename: img.filename,
          disposition: 'inline',
          content_id: cid
        });

        imageHtml += `
          <img
            src="cid:${cid}"
            alt="Product Photo ${index + 1}"
            style="max-width:100%;margin:15px 0;border-radius:6px;border:1px solid #e5e7eb;"
          />
        `;
      });

      imageHtml += '</div>';
    }

    // ─────────────────────────────
    // Email HTML (unchanged design)
    // ─────────────────────────────
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<style>
body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
}
.container {
  background-color: #f9fafb;
  padding: 20px;
  border-radius: 8px;
}
.header {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  color: white;
  padding: 30px;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 20px;
}
.order-number {
  background-color: #eff6ff;
  border: 2px solid #3b82f6;
  padding: 15px;
  text-align: center;
  margin: 20px 0;
  border-radius: 6px;
}
.images-container img {
  max-width: 100%;
}
.footer {
  background-color: #f3f4f6;
  padding: 15px;
  text-align: center;
  font-size: 12px;
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${senderName}</h1>
  </div>

  <div class="order-number">
    <p>Order #${orderNumber}</p>
  </div>

  <p>Hi ${firstName},</p>
  <p>${customMessage}</p>

  ${imageHtml}

  <p><strong>From:</strong> ${senderName} &lt;${senderEmail}&gt;</p>

  <div class="footer">
    © ${new Date().getFullYear()} ${senderName}
  </div>
</div>
</body>
</html>
`;

    const msg = {
      to: recipientEmail,
      from: {
        email: senderEmail,
        name: senderName
      },
      subject: `Order Confirmation #${orderNumber} - ${recipientName}`,
      html: htmlContent,
      attachments
    };

    await sgMail.send(msg);

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = app;