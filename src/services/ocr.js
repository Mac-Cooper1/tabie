/**
 * Mindee V2 OCR Service
 * 
 * Uses the new V2 API with async processing:
 * 1. POST to /v2/inferences/enqueue with model_id and file
 * 2. Poll GET /v2/inferences/{job_id} until complete
 * 
 * API Key should be stored in environment or localStorage
 */

const MINDEE_API_URL = 'https://api-v2.mindee.net/v2/inferences'
const MODEL_ID = import.meta.env.VITE_MINDEE_MODEL_ID || '8502f18f-4fe7-4f1b-b1eb-a93ffe0fb743'

// Get API key from localStorage or env
const getApiKey = () => {
  return localStorage.getItem('mindee_api_key') || import.meta.env.VITE_MINDEE_API_KEY
}

// Set API key
export const setMindeeApiKey = (key) => {
  localStorage.setItem('mindee_api_key', key)
}

// Check if API key is set
export const hasMindeeApiKey = () => {
  return !!getApiKey()
}

/**
 * Scan a receipt image using Mindee V2 API
 * @param {File} file - Image file from input
 * @returns {Promise<OcrResult>}
 */
export async function scanReceipt(file) {
  const apiKey = getApiKey()
  
  if (!apiKey) {
    console.warn('Mindee API key not configured, returning mock data')
    return getMockReceiptData()
  }

  try {
    // Step 1: Enqueue the document
    console.log('Uploading receipt to Mindee...')
    
    const formData = new FormData()
    formData.append('model_id', MODEL_ID)
    formData.append('file', file)
    formData.append('rag', 'false')
    
    const enqueueResponse = await fetch(`${MINDEE_API_URL}/enqueue`, {
      method: 'POST',
      headers: {
        'Authorization': apiKey, // V2 uses just the key, no "Token" prefix
      },
      body: formData
    })

    if (!enqueueResponse.ok) {
      const errorText = await enqueueResponse.text()
      console.error('Mindee enqueue error:', enqueueResponse.status, errorText)
      throw new Error(`Upload failed: ${enqueueResponse.status}`)
    }

    const enqueueData = await enqueueResponse.json()
    const jobId = enqueueData.job?.id
    
    if (!jobId) {
      console.error('No job ID in response:', enqueueData)
      throw new Error('No job ID returned')
    }

    console.log('Job ID:', jobId)

    // Step 2: Poll for results
    const result = await pollForResults(jobId, apiKey)
    
    return parseMindeResponse(result)

  } catch (error) {
    console.error('OCR error:', error)
    
    // Return mock data on error for testing
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('Auth error - check your API key')
    }
    
    return {
      success: false,
      error: error.message,
      ...getMockReceiptData(),
      success: false
    }
  }
}

/**
 * Poll for inference results using V2 jobs endpoint
 */
async function pollForResults(jobId, apiKey, maxAttempts = 30, interval = 2000) {
  const JOBS_URL = 'https://api-v2.mindee.net/v2/jobs'

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${maxAttempts}...`)

    // Use redirect=false to get JSON response instead of 302 redirect
    const response = await fetch(`${JOBS_URL}/${jobId}?redirect=false`, {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
      }
    })

    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`)
    }

    const data = await response.json()
    const status = data.job?.status

    console.log('Job status:', status)

    if (status === 'Processed') {
      console.log('Processing complete!')
      // Fetch the actual results from result_url
      if (data.job?.result_url) {
        const resultResponse = await fetch(data.job.result_url, {
          headers: { 'Authorization': apiKey }
        })
        if (resultResponse.ok) {
          return await resultResponse.json()
        }
      }
      return data
    }

    if (status === 'Failed') {
      throw new Error(data.job?.error?.message || 'Processing failed')
    }

    // Still "Processing" - wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error('Timeout waiting for results')
}

/**
 * Parse Mindee V2 response
 */
function parseMindeResponse(data) {
  try {
    // V2 response structure: inference.result.fields
    const fields = data.inference?.result?.fields || {}

    console.log('Parsing Mindee response, fields:', Object.keys(fields))

    // Extract restaurant/supplier name
    const supplierName = extractField(fields, 'supplier_name')

    // Extract date
    const date = extractField(fields, 'date')

    // Extract line items - V2 structure: line_items.items[].fields.{field}.value
    const lineItemsData = fields.line_items?.items || []
    const items = lineItemsData.map((item, index) => {
      const itemFields = item.fields || {}
      return {
        description: itemFields.description?.value || `Item ${index + 1}`,
        quantity: itemFields.quantity?.value || 1,
        unitPrice: itemFields.unit_price?.value || 0,
        totalPrice: itemFields.total_price?.value || 0
      }
    })

    // Extract totals
    const subtotal = extractField(fields, 'total_net') || extractField(fields, 'subtotal') || 0
    const tax = extractField(fields, 'total_tax') || extractField(fields, 'tax') || 0
    const tip = extractField(fields, 'tips_gratuity') || 0
    const total = extractField(fields, 'total_amount') || extractField(fields, 'total') || 0

    console.log('Parsed receipt:', { supplierName, date, itemCount: items.length, subtotal, tax, total })

    return {
      success: true,
      restaurantName: supplierName,
      date,
      items,
      subtotal: parseFloat(subtotal) || 0,
      tax: parseFloat(tax) || 0,
      tip: parseFloat(tip) || 0,
      total: parseFloat(total) || 0
    }

  } catch (error) {
    console.error('Error parsing Mindee response:', error)
    return {
      success: false,
      error: 'Failed to parse receipt data',
      ...getMockReceiptData()
    }
  }
}

/**
 * Extract a single field value
 */
function extractField(fields, fieldName) {
  const field = fields[fieldName]
  if (!field) return null
  
  // Handle different field structures
  if (field.value !== undefined) return field.value
  if (field.content !== undefined) return field.content
  if (typeof field === 'string' || typeof field === 'number') return field
  
  return null
}

/**
 * Extract a list field (like line_items)
 */
function extractListField(fields, fieldName) {
  const field = fields[fieldName]
  if (!field) return []
  
  if (Array.isArray(field)) return field
  if (field.values && Array.isArray(field.values)) return field.values
  if (field.items && Array.isArray(field.items)) return field.items
  
  return []
}

/**
 * Mock data for testing without API
 */
function getMockReceiptData() {
  return {
    success: true,
    restaurantName: 'Olive Garden',
    date: new Date().toISOString().split('T')[0],
    items: [
      { description: 'Chicken Alfredo', quantity: 1, unitPrice: 18.99, totalPrice: 18.99 },
      { description: 'Caesar Salad', quantity: 2, unitPrice: 9.50, totalPrice: 19.00 },
      { description: 'Breadsticks', quantity: 1, unitPrice: 0, totalPrice: 0 },
      { description: 'Spaghetti & Meatballs', quantity: 1, unitPrice: 17.49, totalPrice: 17.49 },
      { description: 'Tiramisu', quantity: 1, unitPrice: 8.99, totalPrice: 8.99 },
      { description: 'Iced Tea', quantity: 3, unitPrice: 3.29, totalPrice: 9.87 },
      { description: 'Coke', quantity: 2, unitPrice: 3.29, totalPrice: 6.58 },
    ],
    subtotal: 80.92,
    tax: 7.28,
    tip: 0,
    total: 88.20
  }
}

/**
 * Calculate tip suggestions
 */
export function getTipSuggestions(subtotal) {
  return [
    { percentage: 15, amount: Math.round(subtotal * 0.15 * 100) / 100 },
    { percentage: 18, amount: Math.round(subtotal * 0.18 * 100) / 100 },
    { percentage: 20, amount: Math.round(subtotal * 0.20 * 100) / 100 },
    { percentage: 25, amount: Math.round(subtotal * 0.25 * 100) / 100 },
  ]
}
