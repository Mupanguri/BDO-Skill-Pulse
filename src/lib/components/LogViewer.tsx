import React, { useState, useEffect } from 'react'
import Button from './Button'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  metadata: any
  pid: number
  memory: any
  uptime: number
}

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filterLevel, setFilterLevel] = useState<string>('ALL')
  const [isRealTime, setIsRealTime] = useState<boolean>(true)
  const [autoScroll, setAutoScroll] = useState<boolean>(true)

  // Fetch logs from server
  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs')
      if (response.ok) {
        const logData = await response.json()
        setLogs(logData.logs || [])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  // Filter logs based on level
  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'ALL') return true
    return log.level === filterLevel
  })

  // Get unique log levels for filter options
  const logLevels = ['ALL', ...new Set(logs.map(log => log.level))]

  // Auto-refresh logs
  useEffect(() => {
    if (isRealTime) {
      const interval = setInterval(fetchLogs, 2000) // Fetch every 2 seconds
      return () => clearInterval(interval)
    }
  }, [isRealTime])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll) {
      const logContainer = document.getElementById('log-container')
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight
      }
    }
  }, [logs, autoScroll])

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-50'
      case 'WARN': return 'text-yellow-600 bg-yellow-50'
      case 'INFO': return 'text-blue-600 bg-blue-50'
      case 'DEBUG': return 'text-gray-600 bg-gray-50'
      case 'PERFORMANCE': return 'text-green-600 bg-green-50'
      case 'DATABASE': return 'text-purple-600 bg-purple-50'
      case 'API': return 'text-indigo-600 bg-indigo-50'
      case 'AUTHENTICATION': return 'text-orange-600 bg-orange-50'
      case 'USER_ACTION': return 'text-teal-600 bg-teal-50'
      case 'SYSTEM_HEALTH': return 'text-green-700 bg-green-100'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const exportLogs = () => {
    const logText = logs.map(log => 
      `${log.timestamp} [${log.level}] ${log.message} ${JSON.stringify(log.metadata)}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'POST' })
      setLogs([])
    } catch (error) {
      console.error('Error clearing logs:', error)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setFilterLevel('ALL')}
            className={filterLevel === 'ALL' ? 'bg-blue-100 text-blue-800' : ''}
          >
            All
          </Button>
          {logLevels.slice(1).map(level => (
            <Button
              key={level}
              variant="outline"
              onClick={() => setFilterLevel(level)}
              className={filterLevel === level ? getLogLevelColor(level) : ''}
            >
              {level}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsRealTime(!isRealTime)}
            className={isRealTime ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
          >
            {isRealTime ? 'Pause' : 'Resume'} Real-time
          </Button>
          <Button
            variant="outline"
            onClick={() => setAutoScroll(!autoScroll)}
            className={autoScroll ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
          >
            {autoScroll ? 'Disable' : 'Enable'} Auto-scroll
          </Button>
          <Button
            variant="outline"
            onClick={fetchLogs}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportLogs}
          >
            Export
          </Button>
          <Button
            variant="outline"
            onClick={clearLogs}
            className="bg-red-100 text-red-800"
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-2 text-sm text-gray-600 dark:text-gray-300">
        <span>Total logs: {filteredLogs.length}</span>
        <span>Real-time: {isRealTime ? 'ON' : 'OFF'}</span>
      </div>

      <div
        id="log-container"
        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            No logs available. Start using the application to generate logs.
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded ${getLogLevelColor(log.level)} border-l-4 ${
                log.level === 'ERROR' ? 'border-red-500' :
                log.level === 'WARN' ? 'border-yellow-500' :
                log.level === 'INFO' ? 'border-blue-500' :
                log.level === 'DEBUG' ? 'border-gray-500' :
                log.level === 'PERFORMANCE' ? 'border-green-500' :
                log.level === 'DATABASE' ? 'border-purple-500' :
                log.level === 'API' ? 'border-indigo-500' :
                log.level === 'AUTHENTICATION' ? 'border-orange-500' :
                log.level === 'USER_ACTION' ? 'border-teal-500' :
                log.level === 'SYSTEM_HEALTH' ? 'border-green-600' :
                'border-gray-400'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold">{log.level}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
              <div className="mt-1">{log.message}</div>
              {Object.keys(log.metadata).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    Metadata
                  </summary>
                  <pre className="mt-1 text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
