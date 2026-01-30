import express from 'express'
import Stripe from 'stripe'

const router = express.Router()

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Webhook endpoint needs raw body for signature verification
// This must be before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  let event

  try {
    // Verify the webhook signature - this ensures the request is really from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      console.log('Payment succeeded:', paymentIntent.id)
      // TODO: Update tab payment status in Firebase
      // You can access metadata like tabId, participantId from paymentIntent.metadata
      break

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object
      console.log('Payment failed:', failedPayment.id)
      // TODO: Handle failed payment (notify user, etc.)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.json({ received: true })
})

// Create a payment intent for a participant's share
router.post('/create-payment-intent', express.json(), async (req, res) => {
  try {
    const { amount, tabId, participantId, participantName } = req.body

    // Validate required fields
    if (!amount || !tabId || !participantId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(amount * 100)

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tabId,
        participantId,
        participantName: participantName || 'Guest'
      }
    })

    res.json({
      clientSecret: paymentIntent.client_secret
    })
  } catch (err) {
    console.error('Error creating payment intent:', err)
    res.status(500).json({ error: 'Failed to create payment' })
  }
})

// Get payment status for a tab
router.get('/payment-status/:tabId', async (req, res) => {
  try {
    const { tabId } = req.params

    // Search for payment intents with this tabId in metadata
    const paymentIntents = await stripe.paymentIntents.search({
      query: `metadata['tabId']:'${tabId}'`,
    })

    const payments = paymentIntents.data.map(pi => ({
      participantId: pi.metadata.participantId,
      participantName: pi.metadata.participantName,
      amount: pi.amount / 100,
      status: pi.status,
      createdAt: new Date(pi.created * 1000).toISOString()
    }))

    res.json({ payments })
  } catch (err) {
    console.error('Error fetching payment status:', err)
    res.status(500).json({ error: 'Failed to fetch payments' })
  }
})

export default router
