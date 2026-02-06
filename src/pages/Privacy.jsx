import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Header */}
      <div className="sticky top-0 bg-stone-950/90 backdrop-blur-sm border-b border-stone-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-stone-800 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">Privacy Policy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-stone-400 text-sm mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-stone-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Introduction</h2>
            <p>
              Tabie ("we," "our," or "us") operates the website www.trytabie.com and related services.
              This Privacy Policy explains how we collect, use, and protect your information when you use our bill-splitting platform.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Information We Collect</h2>
            <p className="mb-2">We collect information you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Phone number (for account creation and authentication)</li>
              <li>Name (for display to other users)</li>
              <li>Receipt images and extracted bill data</li>
              <li>Payment account information (Venmo, PayPal, Cash App usernames)</li>
              <li>Phone numbers of contacts you invite to split bills</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">How We Use Your Information</h2>
            <p className="mb-2">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and facilitate bill splitting between users</li>
              <li>Send SMS messages related to bill splits and payment requests</li>
              <li>Send reminders about pending payments</li>
              <li>Communicate with you about your account and our services</li>
              <li>Protect against fraud and unauthorized activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">SMS Messaging</h2>
            <p className="mb-2">
              When you use Tabie to split a bill, we send SMS messages to the phone numbers you provide.
              These messages may include:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Notifications about bills shared with them</li>
              <li>Payment reminders</li>
              <li>Links to view and pay their share</li>
            </ul>
            <p className="mt-2">
              Message frequency varies based on usage. Message and data rates may apply.
              Recipients can reply STOP to opt out at any time.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Information Sharing</h2>
            <p className="mb-2">We do not sell your personal information. We may share information:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>With other users as necessary to facilitate bill splitting</li>
              <li>With service providers who assist in operating our platform (e.g., SMS delivery, payment processing)</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and the safety of users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your information.
              However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Your Choices</h2>
            <p className="mb-2">You can:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Reply STOP to any SMS to opt out of future messages</li>
              <li>Reply HELP for assistance</li>
              <li>Contact us to request deletion of your account and data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-3">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at support@trytabie.com.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
