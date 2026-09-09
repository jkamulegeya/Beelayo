import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { Button } from '../components/ui.jsx'

function FieldIcon({ name }) {
  const paths = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 8l9 6 9-6" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    numeric: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18M10 14l2 2 4-4" />
      </>
    ),
  }
  return (
    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {paths[name]}
      </svg>
    </span>
  )
}

function LabeledField({ label, icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-black/70">{label}</span>
      <div className="relative">
        <FieldIcon name={icon} />
        <input
          className="w-full rounded-sm border border-black/10 bg-white py-3 pl-10 pr-3.5 text-base text-black placeholder:text-black/30 focus:border-[#BD1E1E] focus:outline-none focus:ring-2 focus:ring-[#BD1E1E]/20 sm:text-sm"
          {...props}
        />
      </div>
    </label>
  )
}

export default function Login() {
  const [mode, setMode] = useState('signup')
  const [contactType, setContactType] = useState('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState('credentials')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const switchContactType = (type) => {
    setContactType(type)
    setError('')
    setMessage('')
    setStage('credentials')
    setOtp('')
  }

  const switchMode = (m) => {
    setMode(m)
    setError('')
    setMessage('')
    setStage('credentials')
    setOtp('')
  }

  const sendPhoneOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) throw error
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      // Email signup / signin with password
      if (contactType === 'email') {
        let result
        if (mode === 'signup') {
          result = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          })
        } else {
          result = await supabase.auth.signInWithPassword({ email, password })
        }
        if (result.error) throw result.error
        if (result.data.session) {
          navigate('/app')
        } else if (result.data.user && !result.data.session) {
          setMessage('Check your email to confirm your account, then sign in.')
        }
        return
      }

      // Phone always uses OTP
      if (stage === 'credentials') {
        await sendPhoneOtp()
        setMessage('A verification code was sent to your phone.')
        setStage('otp')
        setLoading(false)
        return
      }

      // Verify OTP -> creates session (and user if new)
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp.trim(),
        type: 'sms',
      })
      if (error) throw error
      if (data.session) navigate('/app')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const segBase = 'rounded-sm py-2.5 text-sm font-semibold transition'
  const seg = (active) =>
    active ? 'bg-black text-white shadow-sm' : 'text-black/60 hover:text-black'

  const heading = mode === 'signup' ? 'Create your account' : 'Welcome back'
  const sub =
    mode === 'signup'
      ? 'Start planning your next event in minutes.'
      : 'Sign in to manage your invitations and RSVPs.'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5E2C8] px-4 py-10 text-black antialiased">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-white/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-black/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center">
            <span className="flex h-12 items-center overflow-hidden rounded-sm bg-white px-2.5 shadow-lg shadow-black/10 border border-black/5">
              <img src="/logo.jpg" alt="Belayo logo" className="h-10 max-w-[10rem] object-contain" />
            </span>
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#17255A]">{heading}</h1>
          <p className="mt-1.5 text-sm text-black/60">{sub}</p>
        </div>

        <div className="rounded-sm bg-white p-5 shadow-2xl shadow-black/10 sm:p-7">
          {/* Contact type */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-sm bg-[#FBF1E0] p-1">
            <button
              type="button"
              onClick={() => switchContactType('email')}
              className={`${segBase} ${seg(contactType === 'email')}`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => switchContactType('phone')}
              className={`${segBase} ${seg(contactType === 'phone')}`}
            >
              Phone
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {contactType === 'email' ? (
              <>
                <LabeledField label="Email address" icon="mail" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <LabeledField label="Password" icon="lock" type="password" required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </>
            ) : stage === 'credentials' ? (
              <LabeledField label="Phone number" icon="phone" type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256 7XX XXX XXX" />
            ) : (
              <>
                <LabeledField label="Verification code" icon="numeric" type="text" inputMode="numeric" required autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter the 6-digit code" />
                <p className="-mt-1 text-xs text-black/50">
                  Code sent to <span className="font-semibold text-black">{phone}</span>.{' '}
                  <button type="button" onClick={() => switchContactType('phone')} className="font-semibold text-[#A01111] underline-offset-2 hover:underline">
                    Change number
                  </button>
                </p>
              </>
            )}

            {error && (
              <div className="rounded-sm border border-neutral-300 bg-neutral-900 px-3.5 py-2.5 text-sm text-white">{error}</div>
            )}
            {message && (
              <div className="rounded-sm border border-black/10 bg-[#FBF1E0] px-3.5 py-2.5 text-sm text-black/70">{message}</div>
            )}

            <Button
              type="submit"
              disabled={loading || (contactType === 'phone' && stage === 'otp' && otp.trim().length < 4)}
              className="w-full min-h-[52px] rounded-sm !bg-[#A01111] hover:!bg-[#850C0C] shadow-lg shadow-[#17255A]/20 text-base font-bold"
            >
              {loading
                ? 'Please wait…'
                : contactType === 'phone' && stage === 'otp'
                ? 'Verify code'
                : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-black/60">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')} className="font-bold text-[#A01111] underline-offset-2 hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to Belayo?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-bold text-[#A01111] underline-offset-2 hover:underline">
                  Create an account
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-black/50">
          Guests who receive your invitation link don't need an account to RSVP.
        </p>
        <div className="mt-3 text-center">
          <Link to="/" className="text-sm font-semibold text-[#A01111] underline-offset-2 hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}