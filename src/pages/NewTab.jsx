import { useNavigate } from 'react-router-dom'
import { useBillStore } from '../stores/billStore'
import { ArrowLeft, Camera, Edit3, FileText } from 'lucide-react'

export default function NewTab() {
  const navigate = useNavigate()
  const { createTab, setCurrentTab } = useBillStore()

  const handleScanReceipt = async () => {
    try {
      await createTab()
      navigate('/scan')
    } catch (error) {
      console.error('Error creating tab:', error)
      alert('Failed to create tab. Please try again.')
    }
  }

  const handleManualEntry = async () => {
    try {
      await createTab()
      navigate('/invite-people')
    } catch (error) {
      console.error('Error creating tab:', error)
      alert('Failed to create tab. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-tabie-bg px-6 py-8">
      {/* Header */}
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-2 text-tabie-muted hover:text-tabie-text transition-colors mb-8 focus-ring rounded-lg"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-tabie-text mb-2">New Tab</h1>
        <p className="text-tabie-muted">How would you like to start?</p>
      </div>

      <div className="space-y-4">
        {/* Scan Receipt */}
        <button
          onClick={handleScanReceipt}
          className="w-full card flex items-start gap-4 hover:border-tabie-primary/50 transition-colors duration-200 text-left group focus-ring"
        >
          <div className="w-12 h-12 rounded-xl bg-tabie-primary/20 flex items-center justify-center group-hover:bg-tabie-primary/30 transition-colors">
            <Camera className="w-6 h-6 text-tabie-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-tabie-text mb-1">Scan Receipt</h3>
            <p className="text-tabie-muted text-sm">
              Take a photo or upload an image. We'll extract all the items automatically.
            </p>
          </div>
        </button>

        {/* Manual Entry */}
        <button
          onClick={handleManualEntry}
          className="w-full card flex items-start gap-4 hover:border-tabie-primary/50 transition-colors duration-200 text-left group focus-ring"
        >
          <div className="w-12 h-12 rounded-xl bg-tabie-primary/20 flex items-center justify-center group-hover:bg-tabie-primary/30 transition-colors">
            <Edit3 className="w-6 h-6 text-tabie-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-tabie-text mb-1">Enter Manually</h3>
            <p className="text-tabie-muted text-sm">
              Add items and prices yourself. Great for splitting without a receipt.
            </p>
          </div>
        </button>

        {/* Info card */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mt-8">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-300 mb-1">Pro tip</h4>
              <p className="text-sm text-blue-300/70">
                Scanning works best with clear, well-lit photos. Hold your phone steady and make sure the entire receipt is visible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
