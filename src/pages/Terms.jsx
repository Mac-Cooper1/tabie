import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-stone-950/90 backdrop-blur-sm border-b border-stone-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-stone-800 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-stone-400 text-sm mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-stone-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Agreement to Terms</h2>
            <p>
              By accessing or using Tabie ("Service"), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Description of Service</h2>
            <p>
              Tabie is a bill-splitting platform that helps users divide restaurant bills and other shared expenses.
              The Service allows users to photograph receipts, assign items to participants, and request payments from friends via SMS.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">SMS Terms</h2>
            <p className="mb-3">
              By using Tabie, you consent to receive SMS messages related to the Service. When you add contacts to split a bill,
              they will receive SMS messages from Tabie on your behalf.
            </p>
            <div className="bg-stone-900 rounded-lg p-4 space-y-2">
              <p><strong className="text-white">Program Name:</strong> Tabie Bill Splitting</p>
              <p><strong className="text-white">Message Frequency:</strong> Varies based on bill activity. Users may receive initial notifications and payment reminders.</p>
              <p><strong className="text-white">Message & Data Rates:</strong> Standard message and data rates may apply.</p>
              <p><strong className="text-white">Opt-Out:</strong> Reply <strong>STOP</strong> to unsubscribe from messages.</p>
              <p><strong className="text-white">Help:</strong> Reply <strong>HELP</strong> for assistance or contact mac.cooper002@gmail.com.</p>
            </div>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">User Responsibilities</h2>
            <p className="mb-2">When using Tabie, you agree to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Only add phone numbers of people who actually participated in the shared expense</li>
              <li>Provide accurate information about bills and amounts</li>
              <li>Not use the Service for fraudulent or illegal purposes</li>
              <li>Respect the opt-out preferences of message recipients</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Payments</h2>
            <p>
              Tabie facilitates payment requests but does not process payments directly.
              Payments are made through third-party services (Venmo, PayPal, Cash App, etc.).
              Tabie is not responsible for payment disputes between users.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Limitation of Liability</h2>
            <p>
              Tabie is provided "as is" without warranties of any kind. We are not liable for any indirect,
              incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the Service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Contact</h2>
            <p>
              For questions about these Terms, contact us at mac.cooper002@gmail.com.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
