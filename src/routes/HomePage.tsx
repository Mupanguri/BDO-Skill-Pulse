import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/contexts/AuthContext'

function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="ui-page">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
        {/* Background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0c2a5e 50%, #0a1628 100%)' }} />

        {/* Animated blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #cc0000 0%, transparent 70%)', animation: 'pulse 6s ease-in-out infinite' }} />
        <div className="absolute bottom-0 -left-16 w-80 h-80 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0066cc 0%, transparent 70%)', animation: 'pulse 8s ease-in-out infinite 2s' }} />

        {/* Geometric circles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-5 border border-white pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full opacity-5 border border-white pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between px-8 sm:px-16" style={{ minHeight: '100vh' }}>
          {/* Top — logo */}
          <div className="pt-10">
            <img src="/BDO Corner preview.png" alt="BDO" className="h-16 w-auto drop-shadow-2xl" />
          </div>

          {/* Center — heading + description + CTAs */}
          <div className="py-16">
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6 tracking-tight">
              BDO<br />
              <span style={{ color: '#cc2200' }}>Skills</span> Pulse
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed max-w-xl mb-6">
              Empowering professionals through continuous assessment, knowledge validation,
              and competency tracking — aligned to BDO's quality and professional standards.
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {['Knowledge Retention Validation', 'Competency Assessment', 'Professional Development'].map(label => (
                <span key={label} className="inline-flex items-center rounded-full px-3 py-1 text-sm text-blue-100" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {label}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {user ? (
                <button
                  onClick={() => navigate(user.isAdmin || user.isHR ? '/app/portal-select' : '/app/dashboard')}
                  className="rounded-xl px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #cc2200 0%, #e63300 100%)' }}
                >
                  Go to Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-xl px-8 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #cc2200 0%, #e63300 100%)' }}
                >
                  Access Site
                </button>
              )}
              <a
                href="#about"
                className="rounded-xl border-2 border-white/40 px-8 py-3 font-semibold text-white transition-all hover:border-white hover:bg-white/10 text-center"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Bottom — stats + blockquote */}
          <div className="pb-12">
            <div className="flex gap-10 mb-8">
              {[
                { value: '7', label: 'Departments' },
                { value: '100+', label: 'Staff Members' },
                { value: '∞', label: 'Learning Sessions' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-blue-300 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <blockquote className="border-l-4 border-red-600 pl-4 max-w-lg">
              <p className="text-sm text-blue-200 italic leading-relaxed">
                "Continuous learning is the foundation of professional excellence."
              </p>
              <footer className="text-xs text-blue-400 mt-1">BDO Zimbabwe</footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="px-2 py-4 md:py-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold" style={{ color: 'var(--ui-text)' }}>
            About BDO Skills Pulse
          </h2>
          <p className="mx-auto max-w-3xl text-xl" style={{ color: 'var(--ui-text-muted)' }}>
            Purpose and Objectives: Building a Learning Organization of Excellence
          </p>
        </div>

        <div className="mb-16 grid gap-8 lg:grid-cols-3">
          <div className="ui-card border-t-4 border-bdo-navy p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-bdo-navy/10">
              <svg className="h-6 w-6 text-bdo-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="mb-4 text-xl font-semibold" style={{ color: 'var(--ui-text)' }}>Our Purpose</h3>
            <p className="leading-relaxed" style={{ color: 'var(--ui-text-muted)' }}>
              BDO Skills Pulse serves as a comprehensive training effectiveness and competency validation platform
              designed to measure knowledge retention, practical application readiness, and professional development
              progress across BDO&apos;s workforce.
            </p>
          </div>

          <div className="ui-card border-t-4 border-bdo-blue p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-bdo-blue/10">
              <svg className="h-6 w-6 text-bdo-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mb-4 text-xl font-semibold" style={{ color: 'var(--ui-text)' }}>Core Objectives</h3>
            <ul className="space-y-3" style={{ color: 'var(--ui-text-muted)' }}>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-blue"></span>Knowledge retention validation and competency assessment</li>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-blue"></span>Risk mitigation and quality assurance through skill validation</li>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-blue"></span>Career development pathway mapping and transparent progression</li>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-blue"></span>Training ROI optimization and continuous improvement</li>
            </ul>
          </div>

          <div className="ui-card border-t-4 border-bdo-red p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-bdo-red/10">
              <svg className="h-6 w-6 text-bdo-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mb-4 text-xl font-semibold" style={{ color: 'var(--ui-text)' }}>Expected Outcomes</h3>
            <ul className="space-y-3" style={{ color: 'var(--ui-text-muted)' }}>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-red"></span>Enhanced audit quality and reduced error rates</li>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-red"></span>Improved client confidence through demonstrable staff competency</li>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-red"></span>Reduced liability exposure from knowledge-based mistakes</li>
              <li className="flex items-start"><span className="mt-2 mr-3 h-2 w-2 flex-shrink-0 rounded-full bg-bdo-red"></span>Competitive advantage in talent retention and client acquisition</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-bdo-navy to-bdo-blue p-10 text-white">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-3xl font-bold">Professional Standards Compliance</h3>
              <p className="mb-6 leading-relaxed text-blue-100">
                BDO Skills Pulse maintains documented evidence of employee competency in areas required by
                professional bodies (AICPA, IIA, ISACA) and regulatory authorities.
              </p>
              <div className="flex flex-wrap gap-2">
                {['AICPA', 'IIA', 'ISACA', 'CPE'].map((item) => (
                  <span key={item} className="rounded-full bg-white/20 px-3 py-1 text-sm">{item}</span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <blockquote className="border-l-4 border-white/30 pl-6 text-xl italic">
                &ldquo;This application isn&apos;t simply about testing; it&apos;s about building a learning organization where excellence is measured, recognized, and continuously developed.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
