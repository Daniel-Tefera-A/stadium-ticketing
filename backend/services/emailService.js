const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate PDF ticket
const generateTicketPDF = async (data) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    
    // Add content
    doc.fontSize(20).fillColor('#ff4d4d').text('STADIUM EVENTS', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('black').text('ADMIT ONE', { align: 'center' });
    doc.moveDown();
    
    // Event details
    doc.fontSize(12).text(`Event: ${data.eventName}`);
    doc.text(`Date: ${data.eventDate}`);
    doc.text(`Venue: ${data.venue}`);
    doc.moveDown();
    
    // Customer details
    doc.text(`Name: ${data.customerName}`);
    doc.text(`Booking Ref: ${data.bookingReference}`);
    doc.moveDown();
    
    // Seats
    doc.text('Seats:');
    data.seats.forEach(seat => {
      doc.text(`  ${seat.section} - Row ${seat.row}, Seat ${seat.seat}`, { indent: 20 });
    });
    doc.moveDown();
    
    // Total
    doc.fontSize(14).fillColor('#ff4d4d').text(`Total: $${data.total}`);
    
    doc.end();
  });
};

// Email templates with attachments
const templates = {
  bookingConfirmation: async (data) => {
    const pdfBuffer = await generateTicketPDF(data);
    
    return {
      subject: `🎟️ Booking Confirmed: ${data.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ff4d4d;">Booking Confirmed! 🎉</h1>
          <p>Dear ${data.customerName},</p>
          <p>Your booking has been confirmed. Your tickets are attached to this email.</p>
          
          <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Booking Summary</h3>
            <p><strong>Reference:</strong> ${data.bookingReference}</p>
            <p><strong>Event:</strong> ${data.eventName}</p>
            <p><strong>Date:</strong> ${data.eventDate}</p>
            <p><strong>Venue:</strong> ${data.venue}</p>
            <p><strong>Total:</strong> $${data.total}</p>
          </div>
          
          <p>Please bring this email (printed or on your phone) to the event.</p>
          <p>Thank you for choosing Stadium Events!</p>
        </div>
      `,
      attachments: [{
        filename: `ticket-${data.bookingReference}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    };
  },

  bookingCancelled: (data) => ({
    subject: `❌ Booking Cancelled: ${data.bookingReference}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Booking Cancelled</h1>
        <p>Dear ${data.customerName},</p>
        <p>Your booking <strong>${data.bookingReference}</strong> has been cancelled.</p>
        <p>If you did not request this cancellation, please contact us immediately.</p>
      </div>
    `
  })
};

// Send email function
const sendEmail = async (to, templateName, data) => {
  try {
    // For development, just log
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 EMAIL WOULD BE SENT:');
      console.log('To:', to);
      console.log('Template:', templateName);
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('📧\n');
      return { success: true, messageId: 'dev-' + Date.now() };
    }

    const template = await templates[templateName](data);
    
    const mailOptions = {
      from: `"Stadium Events" <${process.env.EMAIL_USER}>`,
      to,
      ...template
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