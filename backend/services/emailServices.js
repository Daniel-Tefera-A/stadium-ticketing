const nodemailer = require('nodemailer');

// Create transporter (configure for your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use SMTP settings
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const templates = {
  bookingConfirmation: (data) => ({
    subject: `🎟️ Booking Confirmed: ${data.eventName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff4d4d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f8f8; padding: 30px; border-radius: 0 0 8px 8px; }
          .booking-ref { background: white; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center; }
          .ref-code { font-size: 24px; font-weight: bold; color: #ff4d4d; letter-spacing: 2px; }
          .details { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .seat { display: inline-block; background: #ff4d4d; color: white; padding: 5px 10px; margin: 3px; border-radius: 4px; font-size: 14px; }
          .total { font-size: 20px; font-weight: bold; color: #ff4d4d; text-align: right; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed! 🎉</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your booking has been confirmed. Please find your ticket details below.</p>
            
            <div class="booking-ref">
              <p style="margin: 0 0 5px 0;">Booking Reference:</p>
              <div class="ref-code">${data.bookingReference}</div>
            </div>

            <div class="details">
              <h3>Event Details</h3>
              <p><strong>Event:</strong> ${data.eventName}</p>
              <p><strong>Date:</strong> ${data.eventDate}</p>
              <p><strong>Venue:</strong> ${data.venue}</p>
              
              <h3 style="margin-top: 20px;">Seats</h3>
              <div>
                ${data.seats.map(seat => 
                  `<span class="seat">${seat.section} Row ${seat.row} Seat ${seat.seat}</span>`
                ).join('')}
              </div>
              
              <div class="total">
                Total Paid: $${data.total}
              </div>
            </div>

            <p><strong>Important:</strong> Please arrive at least 30 minutes before the event start time. You can present this email or a printed copy at the entrance.</p>
            
            <div class="footer">
              <p>Thank you for choosing Stadium Events!</p>
              <p>Questions? Contact us at support@stadiumevents.com</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  bookingCancelled: (data) => ({
    subject: `❌ Booking Cancelled: ${data.bookingReference}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { background: #f8f8f8; padding: 30px; margin-top: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Cancelled</h1>
          </div>
          <div class="content">
            <p>Dear ${data.customerName},</p>
            <p>Your booking <strong>${data.bookingReference}</strong> has been cancelled as requested.</p>
            <p>If you did not request this cancellation, please contact us immediately.</p>
            <p>Refunds will be processed within 5-7 business days.</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async (to, templateName, data) => {
  try {
    // For development, just log the email
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 EMAIL WOULD BE SENT:');
      console.log('To:', to);
      console.log('Template:', templateName);
      console.log('Data:', data);
      console.log('📧\n');
      return { success: true, messageId: 'dev-' + Date.now() };
    }

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const { subject, html } = template(data);

    const mailOptions = {
      from: `"Stadium Events" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };