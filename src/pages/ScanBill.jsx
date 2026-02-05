import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBillStore } from '../stores/billStore'
import { scanReceipt, hasMindeeApiKey } from '../services/ocr'
import { ArrowLeft, Camera, Upload, Image, Loader2, AlertCircle } from 'lucide-react'
import heic2any from 'heic2any'

// Supported image formats
const ACCEPTED_FORMATS = 'image/jpeg,image/png,image/webp,image/tiff,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.tiff,.tif,.heic,.heif'

// Check if file is HEIC/HEIF format
const isHeicFile = (file) => {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return type === 'image/heic' || type === 'image/heif' ||
         name.endsWith('.heic') || name.endsWith('.heif')
}

// Convert HEIC/HEIF to JPEG
const convertHeicToJpeg = async (file) => {
  try {
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9
    })
    // heic2any can return an array for multi-image HEIC files
    const resultBlob = Array.isArray(blob) ? blob[0] : blob
    return new File([resultBlob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
      type: 'image/jpeg'
    })
  } catch (error) {
    console.error('HEIC conversion error:', error)
    throw new Error('Failed to convert HEIC image. Please try a different photo.')
  }
}

// Compress image to ensure it fits in Firestore (max ~700KB to be safe)
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Scale down if too wide
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to compressed JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedBase64)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function ScanBill() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const { updateCurrentTab, setItems, setTax, currentTab } = useBillStore()

  const [preview, setPreview] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)

    try {
      // Convert HEIC/HEIF files to JPEG (iPhones use HEIC by default)
      let processableFile = file
      if (isHeicFile(file)) {
        console.log('Converting HEIC file to JPEG...')
        processableFile = await convertHeicToJpeg(file)
      }

      // Compress and show preview
      const compressedImage = await compressImage(processableFile)
      setPreview(compressedImage)

      // Save the compressed image to the tab immediately (so we never lose it)
      if (currentTab?.id || currentTab?.firestoreId) {
        console.log('Saving receipt image to tab...')
        await updateCurrentTab({ receiptImage: compressedImage })
      }

      await processReceipt(processableFile)
    } catch (err) {
      console.error('File processing error:', err)
      setError(err.message || 'Failed to process image. Please try another photo.')
      setIsProcessing(false)
    }
  }

  const processReceipt = async (file) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Run OCR on the image
      const result = await scanReceipt(file)

      if (result.success) {
        // Update the current tab with scanned data
        await updateCurrentTab({
          restaurantName: result.restaurantName
        })

        await setItems(result.items)
        await setTax(result.tax)

        // Navigate to invite people page
        navigate('/invite-people')
      } else {
        setError(result.error || 'Failed to process receipt')
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const triggerCamera = () => {
    cameraInputRef.current?.click()
  }

  const handleRetry = async () => {
    setPreview(null)
    setError(null)
    // Clear the saved image too
    if (currentTab?.id || currentTab?.firestoreId) {
      await updateCurrentTab({ receiptImage: null })
    }
  }

  const handleSkip = () => {
    // Image is already saved when captured, just navigate
    navigate('/invite-people')
  }

  return (
    <div className="min-h-screen bg-tabie-bg px-6 py-8 flex flex-col">
      {/* Header */}
      <button
        onClick={() => navigate('/new-tab')}
        className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-tabie-text mb-2">Scan Receipt</h1>
        <p className="text-tabie-muted">Take a photo or upload an image of your receipt</p>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview / Upload Area */}
      <div className="flex-1 flex flex-col">
        {isProcessing ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-tabie-surface flex items-center justify-center mb-4">
              <Loader2 className="w-10 h-10 text-tabie-primary animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-tabie-text mb-2">Reading Receipt...</h3>
            <p className="text-tabie-muted text-center">
              Our AI is extracting items and prices.<br />This may take a few seconds.
            </p>
          </div>
        ) : preview ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 rounded-2xl overflow-hidden border border-tabie-border mb-4">
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full h-full object-contain bg-tabie-surface"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleRetry} className="flex-1 btn-secondary">
                Retake
              </button>
              <button onClick={handleSkip} className="flex-1 btn-primary">
                Continue Anyway
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Upload options */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Camera button */}
              <button
                onClick={triggerCamera}
                className="flex-1 rounded-2xl border-2 border-dashed border-tabie-border hover:border-tabie-primary/50 transition-colors flex flex-col items-center justify-center gap-4 p-8"
              >
                <div className="w-16 h-16 rounded-2xl bg-tabie-primary/20 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-tabie-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg text-tabie-text">Take Photo</h3>
                  <p className="text-tabie-muted text-sm">Use your camera to scan</p>
                </div>
              </button>

              {/* Upload button */}
              <button
                onClick={triggerFileUpload}
                className="py-6 rounded-2xl border-2 border-dashed border-tabie-border hover:border-purple-500/50 transition-colors flex items-center justify-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-purple-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-tabie-text">Upload Image</h3>
                  <p className="text-tabie-muted text-sm">Select from gallery</p>
                </div>
              </button>
            </div>

            {/* API key notice */}
            {!hasMindeeApiKey() && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mt-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Note:</strong> No Mindee API key set. Mock data will be used for testing.
                </p>
              </div>
            )}

            {/* Skip option */}
            <button
              onClick={handleSkip}
              className="text-tabie-muted hover:text-tabie-text text-sm mt-4 transition-colors"
            >
              Skip and enter items manually →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
