import { Link } from 'react-router-dom'

function Logo({ className = '', src = '/logo.jpg' }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img src={src} alt="Belayo logo" className="h-10 max-w-[11rem] object-contain" />
    </span>
  )
}

const steps = [
  {
    n: '1',
    title: 'Create',
    body: 'Set up your event page with date, venue, and details in under 5 minutes.',
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    n: '2',
    title: 'Share',
    body: 'Send your unique RSVP link via WhatsApp, email, or social media.',
    icon: <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
  },
  {
    n: '3',
    title: 'Track',
    body: 'Watch responses roll in and export your final guest list whenever you need it.',
    icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  },
]

const features = [
  {
    title: 'Live dashboard',
    body: 'Watch RSVPs arrive in real time — no refreshing, no spreadsheets.',
    icon: <path d="M3 3v18h18M7 12l4-4 3 3 5-6" />,
  },
  {
    title: 'One link everywhere',
    body: 'WhatsApp, email, or social — a single link keeps your list in sync.',
    icon: <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />,
  },
  {
    title: 'Beautiful posters',
    body: 'Upload a poster or banner and it leads your invitation page.',
    icon: <path d="M3 3h18v14H3zM8 21h8M12 17v4M4 11h16" />,
  },
  {
    title: 'Export your guest list',
    body: 'Download a clean PDF of responses — ready for planning and print.',
    icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  },
]

const stats = [
  { v: '5 min', l: 'to set up an event' },
  { v: '1 link', l: 'for every invitation' },
  { v: 'Live', l: 'RSVP tracking' },
  { v: 'PDF', l: 'guest list export' },
]

export default function Home() {
  const ctaTarget = '/login'
  const ctaLabel = 'Start planning free'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F5E2C8] text-black antialiased">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#F5E2C8]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Belayo home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="rounded-full px-3 py-2 text-sm font-semibold text-black/70 transition hover:text-black sm:px-4">
              Features
            </a>
            <a href="#how-it-works" className="rounded-full px-3 py-2 text-sm font-semibold text-black/70 transition hover:text-black sm:px-4">
              How it works
            </a>
            <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/60 sm:px-4">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 -top-48 h-[460px] w-[460px] rounded-full bg-white/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[480px] w-[480px] rounded-full bg-black/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-xs font-semibold text-black/80 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#BD1E1E] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#BD1E1E]" />
            </span>
            Trusted by event hosts across Uganda &amp; East Africa
          </span>

          <h1 className="mt-7 text-[40px] font-bold leading-[1.05] tracking-tight text-[#17255A] sm:text-6xl lg:text-[72px]">
            Plan Less,
            <br />
            <span className="bg-gradient-to-r from-[#A01111] via-[#17255A] to-[#A01111] bg-clip-text text-transparent">
              Celebrate More.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-black/80 sm:text-xl">
            Create your event, share one link, and watch your guest list build itself —
            on WhatsApp, email, or any social media.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={ctaTarget}
              className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-sm bg-[#A01111] px-9 py-3.5 text-base font-bold text-white shadow-xl shadow-[#17255A]/25 transition hover:bg-[#850C0C] sm:w-auto"
            >
              {ctaLabel}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-[54px] w-full items-center justify-center rounded-sm border border-black/15 bg-white/50 px-9 py-3.5 text-base font-semibold text-black backdrop-blur transition hover:bg-white sm:w-auto"
            >
              See how it works
            </a>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.l} className="rounded-sm border border-black/10 bg-white/70 px-3 py-4 backdrop-blur">
                <p className="text-xl font-bold text-[#850C0C] sm:text-2xl">{s.v}</p>
                <p className="mt-0.5 text-[11px] font-medium leading-tight text-black/60 sm:text-xs">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Product mock (below hero) ---- */}
        <div className="relative mx-auto max-w-5xl px-4 pb-8 sm:px-6 sm:pb-10">
          <div className="pointer-events-none absolute inset-x-20 top-10 -z-10 hidden h-40 rounded-[3rem] bg-[#A01111]/20 blur-3xl sm:block" />
          <div className="overflow-hidden rounded-sm border border-black/5 bg-white shadow-2xl shadow-[#17255A]/15">
            {/* Mock window bar */}
            <div className="flex items-center justify-between border-b border-black/5 bg-[#FBF1E0] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-black/15" />
                <span className="h-3 w-3 rounded-full bg-black/15" />
                <span className="h-3 w-3 rounded-full bg-black/15" />
              </div>
              <span className="text-xs font-bold text-black/50">belayo.app — live dashboard</span>
              <span className="flex items-center gap-1.5 rounded-full bg-[#BD1E1E] px-2.5 py-1 text-[10px] font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3">
              {[
                {
                  tag: 'WEDDING',
                  title: 'Amina & John',
                  date: 'Sat, Sep 26',
                  going: 47,
                  maybe: 5,
                  banner: 'from-[#BD1E1E] to-[#17255A]',
                },
                {
                  tag: 'BIRTHDAY',
                  title: "Nia's 21st",
                  date: 'Fri, Oct 09',
                  going: 18,
                  maybe: 3,
                  banner: 'from-black to-black/80',
                },
                {
                  tag: 'CORPORATE',
                  title: 'UG Tech Meetup',
                  date: 'Sat, Oct 17',
                  going: 64,
                  maybe: 9,
                  banner: 'from-[#C93A3A] to-[#A01111]',
                },
              ].map((c) => (
                <div key={c.title} className="overflow-hidden rounded-sm border border-black/10">
                  <div className={`flex items-end justify-between bg-gradient-to-br ${c.banner} px-4 py-5 text-white`}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{c.tag}</p>
                      <p className="mt-0.5 text-base font-bold">{c.title}</p>
                      <p className="text-xs text-white/70">{c.date}</p>
                    </div>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                      <rect x="3" y="3" width="18" height="3" rx="1.5" />
                      <rect x="3" y="10" width="18" height="3" rx="1.5" />
                      <rect x="3" y="17" width="12" height="3" rx="1.5" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        <span className="h-6 w-6 rounded-full bg-[#C93A3A]" />
                        <span className="h-6 w-6 rounded-full bg-[#E3A9A9]" />
                        <span className="h-6 w-6 rounded-full bg-black" />
                      </div>
                      <span className="text-[11px] font-semibold text-black/60">guests</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#850C0C]">
                      {c.going} going · {c.maybe} maybe
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 bg-[#FBF1E0] px-4 py-3 sm:px-6">
              <p className="text-xs font-semibold text-black/60">
                <span className="font-bold text-[#850C0C]">129 invites sent</span> · 43 new responses today
              </p>
              <span className="flex items-center gap-2 rounded-sm bg-black px-3.5 py-2 text-xs font-bold text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export guest list
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-8 sm:px-6 sm:pt-10 sm:pb-10">
          <div className="mx-auto max-w-xl text-center">
            <span className="inline-block rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#850C0C]">
              Everything you need
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#17255A] sm:text-4xl">One tool from invite to guest list</h2>
            <p className="mt-3 text-sm text-black/60 sm:text-base">
              Built for real events in Uganda &amp; East Africa — simple enough for anyone.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-sm border border-black/10 bg-white p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#17255A]/10"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#A01111] text-white shadow-lg shadow-[#17255A]/20 transition group-hover:bg-black">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    {f.icon}
                  </svg>
                </span>
                <h3 className="mt-4 text-lg font-bold text-[#BD1E1E]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-black/60">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section id="how-it-works" className="scroll-mt-20 mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <div className="text-center">
          <span className="inline-block rounded-full border border-black/10 bg-white/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#850C0C]">
            How it works
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#17255A] sm:text-4xl">Three steps to a full guest list</h2>
        </div>

        <div className="relative mt-14 grid gap-10 sm:grid-cols-3 sm:gap-6">
          <div className="pointer-events-none absolute left-1/2 top-10 hidden w-[60%] -translate-x-1/2 border-t-2 border-dashed border-[#A01111]/30 sm:block" />
          {steps.map((s) => (
            <div key={s.n} className="relative text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-xl font-bold text-white shadow-xl shadow-[#17255A]/20 ring-8 ring-[#F5E2C8]">
                {s.n}
              </span>
              <span className="mx-auto mt-5 flex h-11 w-11 items-center justify-center rounded-sm bg-[#F6E0E0] text-[#850C0C]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  {s.icon}
                </svg>
              </span>
              <h3 className="mt-3 text-lg font-bold text-[#BD1E1E]">{s.title}</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-black/60">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to={ctaTarget}
            className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-sm bg-black px-10 py-3.5 text-base font-bold text-white shadow-xl shadow-black/15 transition hover:bg-black/85"
          >
            {ctaLabel}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ---- Final CTA band ---- */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-sm bg-[#A01111] px-6 py-14 text-center text-white sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-black/20 blur-2xl" />
          <div className="relative">
            <span className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
              What are you waiting for?
            </span>
            <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Your next event deserves Belayo
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/80 sm:text-base">
              Set up your invitation in minutes and let the RSVPs start rolling in tonight.
            </p>
            <Link
              to={ctaTarget}
              className="mt-8 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-sm bg-white px-10 py-3.5 text-base font-bold text-[#850C0C] shadow-2xl transition hover:bg-black hover:text-white"
            >
              {ctaLabel}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-[#12204b] bg-[#17255A] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <Logo src="/logo-footer.png" />
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                Plan less, celebrate more. Used by all individuals and event hosts across Uganda &amp; East Africa.
              </p>
              <p className="mt-3 text-sm font-semibold text-white/80">
                For Business &amp; Queries Call:{' '}
                <a href="tel:+256751558866" className="text-[#E3A9A9] transition hover:text-white">
                  0751558866
                </a>
              </p>
              <p className="mt-1.5 text-sm font-medium text-white/50">All Rights Reserved © 2026</p>
            </div>

            <div className="flex flex-wrap gap-10 text-sm">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/50">Product</h4>
                <ul className="mt-3 space-y-2.5">
                  <li><a href="#features" className="text-white/80 transition hover:text-white">Features</a></li>
                  <li><a href="#how-it-works" className="text-white/80 transition hover:text-white">How it works</a></li>
                  <li><Link to="/login" className="text-white/80 transition hover:text-white">Create an event</Link></li>
                  <li><Link to="/login" className="text-white/80 transition hover:text-white">Sign in</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/50">Coming soon</h4>
                <ul className="mt-3 space-y-2.5">
                  <li><span className="text-white/60">QR check-in</span></li>
                  <li><span className="text-white/60">Seating planner</span></li>
                  <li><span className="text-white/60">SMS reminders</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
            <p>
              © {new Date().getFullYear()} Belayo. Made with <span className="text-[#D66464]">♥</span> in Uganda.
            </p>
            <p className="text-center">For weddings, birthdays, concerts &amp; corporate events across East Africa</p>
          </div>
        </div>
      </footer>
    </div>
  )
}