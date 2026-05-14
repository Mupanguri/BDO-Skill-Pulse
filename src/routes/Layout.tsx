import { Outlet } from 'react-router-dom'
import { useState } from 'react'
import Sidebar from '../lib/components/Sidebar'
import TutorialManager from '../lib/components/TutorialManager'

function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--ui-bg)' }}>
      {/* Pass mobile menu state to Sidebar */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onNavigate={handleMobileMenuClose}
      />

      {/* Main content - no left margin on mobile, ml-64 on desktop */}
      <main className="lg:ml-64 transition-all duration-300">
        {/* Add top padding on mobile for fixed header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pt-20 lg:pt-8">
          <Outlet />
        </div>
      </main>
      <TutorialManager />
    </div>
  )
}

export default Layout

