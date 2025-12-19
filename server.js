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

    // Validation
    if (!recipientEmail || !orderNumber || !firstName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ error: 'Invalid recipient email' });
    }

    // Create email content
    let htmlContent = `
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
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .order-number {
            background-color: #eff6ff;
            border: 2px solid #3b82f6;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
            border-radius: 6px;
          }
          .order-number p {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
          }
          .content {
            background-color: white;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
          }
          .content p {
            margin: 10px 0;
            font-size: 14px;
          }
          .images-container {
            margin: 20px 0;
            text-align: center;
          }
          .images-container img {
            max-width: 100%;
            height: auto;
            margin: 10px 0;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
          }
          .footer {
            background-color: #f3f4f6;
            padding: 15px;
            text-align: center;
            border-radius: 6px;
            font-size: 12px;
            color: #666;
          }
          .sender-info {
            background-color: #f0f9ff;
            padding: 10px;
            border-left: 4px solid #3b82f6;
            margin: 20px 0;
            font-size: 12px;
            color: #475569;
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

          <div class="content">
            <p>Hi ${firstName},</p>
            <p>${customMessage}</p>
    `;

    // Add images if provided
    if (images && images.length > 0) {
      htmlContent += '<div class="images-container">';
      images.forEach((imageData, index) => {
        htmlContent += `<img src="${imageData}" alt="Product Photo ${index + 1}" style="max-width: 500px; margin: 10px 0;" />`;
      });
      htmlContent += '</div>';
    }

    htmlContent += `
            <p>Thank you for your business! We appreciate your order and look forward to your feedback.</p>
          </div>

          <div class="sender-info">
            <p><strong>From:</strong> ${senderName} &lt;${senderEmail}&gt;</p>
            <p><strong>Domain:</strong> ${senderDomain}</p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} ${senderName}. All rights reserved.</p>
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create mail object
    const msg = {
      to: recipientEmail,
      from: {
        email: senderEmail,
        name: senderName
      },
      subject: `Order Confirmation #${orderNumber} - ${recipientName}`,
      html: htmlContent,
      replyTo: senderEmail,
      categories: ['order-confirmation'],
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High'
      }
    };

    // Send email
    await sgMail.send(msg);

    // Log successful send
    console.log(`Email sent successfully to ${recipientEmail} for order #${orderNumber}`);

    res.status(200).json({
      success: true,
      message: `Order confirmation sent to ${recipientEmail}`,
      orderNumber: orderNumber
    });

  } catch (error) {
    console.error('Error sending email:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Failed to send email',
        details: error.response.body.errors
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

const PORT = process.env.PORT || 5000;

const handler = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}

module.exports = handler;