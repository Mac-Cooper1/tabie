import { useNavigate } from 'react-router-dom'
import { Users, Zap, ArrowRight, Sparkles } from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-tabie-bg overflow-hidden relative">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-tabie-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-tabie-primary-light/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-tabie-primary-dark/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 px-6 pt-16 pb-8 flex flex-col min-h-screen">
        {/* Logo */}
        <div className="flex items-center justify-center mb-4">
          <img src="/logo-white.svg" alt="Tabie" className="h-12" />
        </div>

        {/* Main heading */}
        <div className="text-center mb-8">
          <p className="text-tabie-muted text-lg">
            Split bills.<br />
            <span className="text-tabie-text font-medium">Not friendships.</span>
          </p>
        </div>

        {/* Animated receipt card */}
        <div className="relative mx-auto mb-8 animate-float">
          <div className="gradient-border p-6 rounded-2xl w-64">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-tabie-muted">Margherita Pizza</span>
                <span className="text-tabie-text font-mono">$18.99</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-tabie-muted">Pasta Carbonara</span>
                <span className="text-tabie-text font-mono">$16.50</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-tabie-muted">2x Drinks</span>
                <span className="text-tabie-text font-mono">$8.00</span>
              </div>
              <div className="border-t border-dashed border-tabie-border pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-tabie-muted">Total</span>
                  <span className="text-tabie-primary font-bold font-mono">$43.49</span>
                </div>
              </div>
            </div>

            {/* Floating avatars */}
            <div className="absolute -right-4 top-4 flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-tabie-bg flex items-center justify-center text-xs font-bold text-white">S</div>
              <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-tabie-bg flex items-center justify-center text-xs font-bold text-white">M</div>
              <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-tabie-bg flex items-center justify-center text-xs font-bold text-white">J</div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-auto">
          <Feature
            icon={<Zap className="w-5 h-5" />}
            text="Upload/take a photo of your bill"
            color="text-tabie-warning"
          />
          <Feature
            icon={<Users className="w-5 h-5" />}
            text="Add friends to your tab"
            color="text-blue-500"
          />
          <Feature
            icon={<Sparkles className="w-5 h-5" />}
            text="Get paid what you're owed"
            color="text-tabie-primary"
          />
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 mt-8">
          <button
            onClick={() => navigate('/auth')}
            className="w-full btn-primary flex items-center justify-center gap-2 text-lg"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-sm text-tabie-muted">
            No download required • Works on any device
          </p>
        </div>

        {/* Bottom decoration */}
        <div className="mt-8 flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-tabie-primary/30"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Legal Links */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => navigate('/privacy')}
            className="text-xs text-tabie-muted hover:text-tabie-text transition-colors"
          >
            Privacy Policy
          </button>
          <span className="text-tabie-muted/50">•</span>
          <button
            onClick={() => navigate('/terms')}
            className="text-xs text-tabie-muted hover:text-tabie-text transition-colors"
          >
            Terms of Service
          </button>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, text, color }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-tabie-surface border border-tabie-border">
      <div className={`${color}`}>{icon}</div>
      <span className="text-tabie-text text-sm">{text}</span>
    </div>
  )
}
