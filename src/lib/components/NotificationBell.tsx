import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user])

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }
    if (showPanel) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPanel])

  const fetchNotifications = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/user/${user.email}/notifications`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount((data.notifications || []).filter((n: any) => !n.read).length)
      }
    } catch {}
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/user/${user?.email}/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  if (!user) return null

  return (
    <div ref={panelRef} className="fixed top-4 right-4 z-[70]">
      {/* Bell button */}
      <button
        onClick={() => setShowPanel(v => !v)}
        className="relative p-2.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-bdo-red dark:hover:text-bdo-red transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-bdo-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {showPanel && (
        <div className="absolute top-12 right-0 w-80 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(n.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    {!n.read && <div className="w-2 h-2 bg-bdo-red rounded-full mt-1.5 flex-shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
