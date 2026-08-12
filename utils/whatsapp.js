const twilio = require("twilio");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send WhatsApp message
 * @param {string} to - recipient phone number in format 'whatsapp:+2348012345678'
 * @param {string} message - message text
 */
const sendWhatsApp = async (to, message) => {
  try {
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`, // your Twilio sandbox number
      to: `whatsapp:${to}`,
      body: message
    });
    console.log(`WhatsApp sent to ${to}`);
  } catch (err) {
    console.error("WhatsApp send error:", err);
  }
};

module.exports = sendWhatsApp;
