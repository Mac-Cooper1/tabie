import express from 'express'
import twilio from 'twilio'

const router = express.Router()

// Initialize Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }

  return twilio(accountSid, authToken)
}

// Send invite SMS to join a tab
router.post('/send-invite', async (req, res) => {
  try {
    const { phoneNumber, tabId, inviterName, restaurantName } = req.body

    // Validate required fields
    if (!phoneNumber || !tabId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate phone number format (basic validation)
    const cleanedNumber = phoneNumber.replace(/\D/g, '')
    if (cleanedNumber.length < 10 || cleanedNumber.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }

    // Format phone number for Twilio (add +1 for US if needed)
    const formattedNumber = cleanedNumber.length === 10
      ? `+1${cleanedNumber}`
      : `+${cleanedNumber}`

    const client = getTwilioClient()
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!fromNumber) {
      return res.status(500).json({ error: 'Twilio phone number not configured' })
    }

    // Build the invite URL
    const baseUrl = process.env.FRONTEND_URL || 'https://www.trytabie.com'
    const inviteUrl = `${baseUrl}/join/${tabId}`

    // Build the message
    const senderName = inviterName || 'Someone'
    const billName = restaurantName || 'a bill'
    const message = `${senderName} invited you to split ${billName} on Tabie! Tap to claim your items: ${inviteUrl}`

    // Send the SMS
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedNumber
    })

    res.json({
      success: true,
      messageId: result.sid
    })
  } catch (err) {
    console.error('Error sending SMS:', err)

    // Handle specific Twilio errors
    if (err.code === 21211) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }
    if (err.code === 21608) {
      return res.status(400).json({ error: 'Phone number not verified for trial account' })
    }

    res.status(500).json({ error: 'Failed to send SMS' })
  }
})

// Send payment reminder with direct payment link
router.post('/send-reminder', async (req, res) => {
  try {
    const { phoneNumber, participantName, participantId, amount, tabId, organizerName } = req.body

    if (!phoneNumber || !amount || !tabId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const cleanedNumber = phoneNumber.replace(/\D/g, '')
    const formattedNumber = cleanedNumber.length === 10
      ? `+1${cleanedNumber}`
      : `+${cleanedNumber}`

    const client = getTwilioClient()
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    const baseUrl = process.env.FRONTEND_URL || 'https://www.trytabie.com'
    // Use direct payment URL if participantId is provided
    const payUrl = participantId
      ? `${baseUrl}/pay/${tabId}/${participantId}`
      : `${baseUrl}/checkout/${tabId}`

    const name = participantName || 'Hey'
    const organizer = organizerName || 'The organizer'
    const message = `${name}, ${organizer} is waiting for your $${amount.toFixed(2)} payment on Tabie. Pay now: ${payUrl}`

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedNumber
    })

    res.json({
      success: true,
      messageId: result.sid
    })
  } catch (err) {
    console.error('Error sending reminder:', err)
    res.status(500).json({ error: 'Failed to send reminder' })
  }
})

// Send direct payment link
router.post('/send-payment-link', async (req, res) => {
  try {
    const { phoneNumber, participantName, participantId, amount, tabId, restaurantName } = req.body

    if (!phoneNumber || !amount || !tabId || !participantId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const cleanedNumber = phoneNumber.replace(/\D/g, '')
    const formattedNumber = cleanedNumber.length === 10
      ? `+1${cleanedNumber}`
      : `+${cleanedNumber}`

    const client = getTwilioClient()
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!fromNumber) {
      return res.status(500).json({ error: 'Twilio phone number not configured' })
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://www.trytabie.com'
    const payUrl = `${baseUrl}/pay/${tabId}/${participantId}`

    const name = participantName || 'there'
    const restaurant = restaurantName || 'your meal'
    const message = `Hey ${name}! Your share of ${restaurant} is $${amount.toFixed(2)}. Pay securely with Tabie: ${payUrl}`

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedNumber
    })

    res.json({
      success: true,
      messageId: result.sid
    })
  } catch (err) {
    console.error('Error sending payment link:', err)

    if (err.code === 21211) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }
    if (err.code === 21608) {
      return res.status(400).json({ error: 'Phone number not verified for trial account' })
    }

    res.status(500).json({ error: 'Failed to send payment link' })
  }
})

// Webhook for incoming SMS (if you want to handle replies)
router.post('/webhook', express.urlencoded({ extended: false }), (req, res) => {
  const { From, Body } = req.body

  console.log(`Received SMS from ${From}: ${Body}`)

  // Respond with empty TwiML (no auto-reply for now)
  res.type('text/xml')
  res.send('<Response></Response>')
})

export default router
