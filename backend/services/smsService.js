const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// SMS templates
const templates = {
  bookingConfirmation: (data) => 
    `✅ Booking Confirmed! Ref: ${data.bookingReference}. Event: ${data.eventName} on ${data.eventDate}. Show this SMS at entrance.`,

  bookingReminder: (data) =>
    `⏰ Reminder: ${data.eventName} is tomorrow at ${data.eventTime}. Your seats: ${data.seats}. See you there!`,

  bookingCancelled: (data) =>
    `❌ Booking ${data.bookingReference} has been cancelled. Contact us if this was a mistake.`
};

// Send SMS
const sendSMS = async (to, templateName, data) => {
  try {
    // For development, just log
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📱 SMS WOULD BE SENT:');
      console.log('To:', to);
      console.log('Message:', templates[templateName](data));
      console.log('📱\n');
      return { success: true };
    }

    const message = templates[templateName](data);
    
    const result = await client.messages.create({
      body: message,
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    console.log('✅ SMS sent:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('❌ SMS failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendSMS };