import { useAuth } from '../lib/contexts/AuthContext'

function HomePage() {
  const { user } = useAuth()

  return (
    <div className="ui-page">
      <section className="hero-section ui-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-bdo-navy/90 to-bdo-blue/90"></div>
        <div className="relative px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-white">
              <div className="mb-6 flex items-center gap-4">
                <img
                  src="/bdo_logo.png"
                  alt="BDO Logo"
                  className="h-16 w-auto object-contain brightness-0 invert"
                />
                <div className="border-l-2 border-white/70 pl-4">
                  <h1 className="text-4xl font-bold tracking-tight md:text-5xl">BDO Skills Pulse</h1>
                  <p className="mt-2 text-base font-medium text-blue-100 md:text-lg">
                    Training Effectiveness & Competency Validation
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-blue-100">
                <p className="text-base leading-relaxed md:text-lg">
                  A comprehensive platform designed to measure knowledge retention,
                  practical application readiness, and professional development progress
                  across BDO&apos;s workforce.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm">
                    Knowledge Retention Validation
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm">
                    Competency Assessment
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm">
                    Professional Development
                  </span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="/login"
                  className="rounded-xl bg-white px-8 py-3 font-semibold text-bdo-navy shadow-lg transition-all hover:bg-gray-100 hover:shadow-xl"
                >
                  Get Started
                </a>
                <a
                  href="#about"
                  className="rounded-xl border-2 border-white px-8 py-3 font-semibold text-white transition-all hover:bg-white hover:text-bdo-navy"
                >
                  Learn More
                </a>
              </div>
            </div>

            <div className="ui-card-strong p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900">Welcome to BDO Skills Pulse</h3>
                  <p className="mt-2 text-gray-600">Your professional development and competency validation platform</p>
                </div>

                <div className="grid gap-4">
                  {[
                    ['bg-green-500', 'Knowledge Retention Validation'],
                    ['bg-blue-500', 'Competency Assessment'],
                    ['bg-purple-500', 'Professional Development Tracking']
                  ].map(([color, label]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`h-3 w-3 rounded-full ${color}`}></div>
                        <span className="font-medium text-gray-900">{label}</span>
                      </div>
                      <span className="text-gray-500">✓</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 text-center text-sm text-gray-500">
                  <p className="mb-2 font-medium text-gray-700">Ready to get started?</p>
                  <p className="text-gray-600">Access your personalized dashboard to begin your competency journey</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="px-2 py-4 md:py-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">About BDO Skills Pulse</h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
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
            <h3 className="mb-4 text-xl font-semibold text-gray-900">Our Purpose</h3>
            <p className="leading-relaxed text-gray-700">
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
            <h3 className="mb-4 text-xl font-semibold text-gray-900">Core Objectives</h3>
            <ul className="space-y-3 text-gray-700">
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
            <h3 className="mb-4 text-xl font-semibold text-gray-900">Expected Outcomes</h3>
            <ul className="space-y-3 text-gray-700">
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
                "This application isn&apos;t simply about testing; it&apos;s about building a learning organization where excellence is measured, recognized, and continuously developed."
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {user && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-bdo-red"></div>
          <p className="text-gray-600">Loading your personalized BDO Skills Pulse experience...</p>
        </div>
      )}
    </div>
  )
}

export default HomePage
