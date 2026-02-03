import express from 'express'
import Stripe from 'stripe'

const router = express.Router()

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Frontend URL for redirects
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://trytabie.com'

/**
 * Calculate platform fee for Tabie
 * Flat $0.50 OR 1% (whichever is greater), capped at $2
 * @param {number} amountInCents - Payment amount in cents
 * @returns {number} - Fee in cents
 */
function calculatePlatformFee(amountInCents) {
  const flatFee = 50 // $0.50
  const percentFee = Math.round(amountInCents * 0.01) // 1%
  const fee = Math.max(flatFee, percentFee)
  return Math.min(fee, 200) // Cap at $2
}

// ============================================
// STRIPE CONNECT ENDPOINTS
// ============================================

/**
 * Create a Stripe Connect Express account for a Tab Admin
 * POST /api/stripe/connect/create-account
 */
router.post('/connect/create-account', express.json(), async (req, res) => {
  try {
    const { email, userId } = req.body

    if (!email || !userId) {
      return res.status(400).json({ error: 'Missing required fields: email, userId' })
    }

    // Create a Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: userId,
        platform: 'tabie'
      }
    })

    console.log('Created Stripe Connect account:', account.id, 'for user:', userId)

    res.json({
      accountId: account.id,
      email: account.email
    })
  } catch (err) {
    console.error('Error creating Connect account:', err)
    res.status(500).json({ error: 'Failed to create Connect account', details: err.message })
  }
})

/**
 * Create an onboarding link for Stripe Connect
 * POST /api/stripe/connect/create-onboarding-link
 */
router.post('/connect/create-onboarding-link', express.json(), async (req, res) => {
  try {
    const { accountId, userId } = req.body

    if (!accountId) {
      return res.status(400).json({ error: 'Missing required field: accountId' })
    }

    // Create an Account Link for Stripe's hosted onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${FRONTEND_URL}/settings?onboarding=refresh`,
      return_url: `${FRONTEND_URL}/settings?onboarding=complete`,
      type: 'account_onboarding',
    })

    console.log('Created onboarding link for account:', accountId)

    res.json({
      url: accountLink.url,
      expiresAt: accountLink.expires_at
    })
  } catch (err) {
    console.error('Error creating onboarding link:', err)
    res.status(500).json({ error: 'Failed to create onboarding link', details: err.message })
  }
})

/**
 * Check if a Connect account has completed onboarding
 * GET /api/stripe/connect/account-status/:accountId
 */
router.get('/connect/account-status/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params

    if (!accountId) {
      return res.status(400).json({ error: 'Missing accountId' })
    }

    const account = await stripe.accounts.retrieve(accountId)

    // Check if account can receive payments
    const isOnboarded = account.charges_enabled && account.payouts_enabled
    const detailsSubmitted = account.details_submitted

    res.json({
      accountId: account.id,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: detailsSubmitted,
      isOnboarded: isOnboarded,
      // Include external account info if available (last 4 of bank account)
      externalAccounts: account.external_accounts?.data?.map(ea => ({
        type: ea.object,
        last4: ea.last4,
        bankName: ea.bank_name
      })) || []
    })
  } catch (err) {
    console.error('Error fetching account status:', err)
    res.status(500).json({ error: 'Failed to fetch account status', details: err.message })
  }
})

/**
 * Create a login link for a connected account to access their Stripe dashboard
 * POST /api/stripe/connect/create-login-link
 */
router.post('/connect/create-login-link', express.json(), async (req, res) => {
  try {
    const { accountId } = req.body

    if (!accountId) {
      return res.status(400).json({ error: 'Missing required field: accountId' })
    }

    const loginLink = await stripe.accounts.createLoginLink(accountId)

    res.json({ url: loginLink.url })
  } catch (err) {
    console.error('Error creating login link:', err)
    res.status(500).json({ error: 'Failed to create login link', details: err.message })
  }
})

// ============================================
// WEBHOOK ENDPOINT
// ============================================

// Test endpoint to verify webhook route is reachable
router.get('/webhook-test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Stripe webhook endpoint is reachable',
    timestamp: new Date().toISOString(),
    webhookUrl: '/api/stripe/webhook',
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
  })
})

// Webhook endpoint needs raw body for signature verification
// This must be before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('=== Stripe Webhook Received ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Content-Type:', req.headers['content-type'])
  console.log('Has stripe-signature:', !!req.headers['stripe-signature'])
  console.log('Body type:', typeof req.body)
  console.log('Body is Buffer:', Buffer.isBuffer(req.body))

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('ERROR: Stripe webhook secret not configured')
    return res.status(500).json({ error: 'Webhook not configured' })
  }

  let event

  try {
    // Verify the webhook signature - this ensures the request is really from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
    console.log('Webhook signature verified successfully')
    console.log('Event type:', event.type)
    console.log('Event ID:', event.id)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    console.error('Body length:', req.body?.length || 0)
    return res.status(400).json({ error: 'Invalid signature' })
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object
      console.log('Payment succeeded:', paymentIntent.id)
      console.log('Metadata:', paymentIntent.metadata)
      // The payment went to the connected account via transfer_data
      // You can update Firebase here using Admin SDK if needed
      break

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object
      console.log('Payment failed:', failedPayment.id, failedPayment.last_payment_error?.message)
      break

    case 'account.updated':
      // Handle Connect account updates (onboarding completion)
      const account = event.data.object
      console.log('Account updated:', account.id)
      console.log('Charges enabled:', account.charges_enabled)
      console.log('Payouts enabled:', account.payouts_enabled)
      // You can update Firebase here to mark user as onboarded
      // This would require Firebase Admin SDK
      break

    case 'transfer.created':
      // A transfer to a connected account was created
      const transfer = event.data.object
      console.log('Transfer created:', transfer.id, 'to', transfer.destination, 'amount:', transfer.amount)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.json({ received: true })
})

// ============================================
// PAYMENT ENDPOINTS
// ============================================

/**
 * Create a payment intent for a participant's share
 * Now supports Stripe Connect with platform fee
 * POST /api/stripe/create-payment-intent
 */
router.post('/create-payment-intent', express.json(), async (req, res) => {
  try {
    const { amount, tabId, participantId, participantName, connectedAccountId } = req.body

    // Validate required fields
    if (!amount || !tabId || !participantId) {
      return res.status(400).json({ error: 'Missing required fields: amount, tabId, participantId' })
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Minimum $0.50 for Stripe
    if (amount < 0.50) {
      return res.status(400).json({ error: 'Minimum payment amount is $0.50' })
    }

    // Convert to cents for Stripe
    const amountInCents = Math.round(amount * 100)

    // Build payment intent options
    const paymentIntentOptions = {
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
    }

    // If a connected account is provided, use Stripe Connect
    if (connectedAccountId) {
      const platformFee = calculatePlatformFee(amountInCents)

      paymentIntentOptions.application_fee_amount = platformFee
      paymentIntentOptions.transfer_data = {
        destination: connectedAccountId,
      }
      paymentIntentOptions.metadata.connectedAccountId = connectedAccountId
      paymentIntentOptions.metadata.platformFee = platformFee

      console.log(`Creating Connect payment: $${amount} to ${connectedAccountId}, platform fee: $${platformFee / 100}`)
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions)

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
      platformFee: connectedAccountId ? calculatePlatformFee(amountInCents) : 0
    })
  } catch (err) {
    console.error('Error creating payment intent:', err)
    res.status(500).json({ error: 'Failed to create payment', details: err.message })
  }
})

/**
 * Get payment status for a tab
 * GET /api/stripe/payment-status/:tabId
 */
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

/**
 * Get Stripe publishable key for frontend
 * GET /api/stripe/config
 */
router.get('/config', (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY

  if (!publishableKey) {
    return res.status(500).json({ error: 'Stripe not configured' })
  }

  res.json({ publishableKey })
})

export default router
