// Frontend logging utility for UI interactions and API calls (Browser Compatible)
const frontendLogger = {
  // Format timestamp
  getTimestamp: () => {
    const now = new Date()
    return now.toISOString()
  },

  // Format log entry for browser
  formatEntry: (level, message, metadata = {}) => {
    const timestamp = frontendLogger.getTimestamp()
    const entry = {
      timestamp,
      level,
      message,
      metadata,
      userAgent: navigator.userAgent,
      url: window.location.href,
      pid: 'frontend'
    }
    return JSON.stringify(entry)
  },

  // Write to console and localStorage
  writeLog: (level, message, metadata = {}) => {
    const logEntry = frontendLogger.formatEntry(level, message, metadata)
    
    // Write to console
    if (level === 'ERROR') {
      console.error(`[FRONTEND-${level}] ${message}`, metadata)
    } else if (level === 'WARN') {
      console.warn(`[FRONTEND-${level}] ${message}`, metadata)
    } else {
      console.log(`[FRONTEND-${level}] ${message}`, metadata)
    }

    // Store in localStorage for persistence
    try {
      const logs = JSON.parse(localStorage.getItem('frontend_logs') || '[]')
      logs.push(logEntry)
      
      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000)
      }
      
      localStorage.setItem('frontend_logs', JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to store log in localStorage:', error)
    }
  },

  // Log UI interactions
  uiInteraction: (action, component, metadata = {}) => {
    const interactionData = {
      action,
      component,
      timestamp: frontendLogger.getTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata
    }
    frontendLogger.writeLog('INFO', `UI Interaction: ${action}`, interactionData)
  },

  // Log API calls with timing
  apiCall: async (method, url, data = null, metadata = {}) => {
    const startTime = performance.now()
    const callId = `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const apiData = {
      callId,
      method,
      url,
      data,
      timestamp: frontendLogger.getTimestamp(),
      userAgent: navigator.userAgent,
      ...metadata
    }

    frontendLogger.writeLog('INFO', `API Call: ${method} ${url}`, apiData)

    return {
      callId,
      startTime,
      endTime: null,
      duration: null,
      success: null,
      response: null,
      error: null
    }
  },

  // Log API response
  apiResponse: (callId, startTime, response, error = null) => {
    const endTime = performance.now()
    const duration = endTime - startTime
    const success = error === null

    const responseData = {
      callId,
      duration: Math.round(duration),
      success,
      response: response ? {
        status: response.status,
        statusText: response.statusText,
        data: response.data || null
      } : null,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    }

    if (success) {
      frontendLogger.writeLog('INFO', `API Response: ${callId} - Success (${Math.round(duration)}ms)`, responseData)
    } else {
      frontendLogger.writeLog('ERROR', `API Response: ${callId} - Error (${Math.round(duration)}ms)`, {
        ...responseData,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : null
      })
    }

    return responseData
  },

  // Log user actions
  userAction: (action, page, details = {}) => {
    const userData = {
      action,
      page,
      timestamp: frontendLogger.getTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...details
    }
    frontendLogger.writeLog('INFO', `User Action: ${action}`, userData)
  },

  // Log performance metrics
  performance: (metric, value, metadata = {}) => {
    const perfData = {
      metric,
      value,
      timestamp: frontendLogger.getTimestamp(),
      ...metadata
    }
    frontendLogger.writeLog('INFO', `Performance: ${metric}`, perfData)
  },

  // Log errors
  error: (error, context = {}) => {
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: frontendLogger.getTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    frontendLogger.writeLog('ERROR', 'Frontend Error', errorData)
  },

  // Log page views
  pageView: (page, metadata = {}) => {
    const pageData = {
      page,
      timestamp: frontendLogger.getTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      ...metadata
    }
    frontendLogger.writeLog('INFO', `Page View: ${page}`, pageData)
  },

  // Log form submissions
  formSubmission: (formName, formData, success, metadata = {}) => {
    const formDataLog = {
      formName,
      formData: Object.keys(formData).reduce((acc, key) => {
        // Don't log sensitive data like passwords
        if (key.toLowerCase().includes('password')) {
          acc[key] = '[REDACTED]'
        } else {
          acc[key] = formData[key]
        }
        return acc
      }, {}),
      success,
      timestamp: frontendLogger.getTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...metadata
    }
    frontendLogger.writeLog('INFO', `Form Submission: ${formName}`, formDataLog)
  },

  // Log component lifecycle
  componentLifecycle: (component, lifecycle, metadata = {}) => {
    const lifecycleData = {
      component,
      lifecycle,
      timestamp: frontendLogger.getTimestamp(),
      ...metadata
    }
    frontendLogger.writeLog('INFO', `Component Lifecycle: ${component} - ${lifecycle}`, lifecycleData)
  },

  // Log state changes
  stateChange: (component, stateName, oldValue, newValue, metadata = {}) => {
    const stateData = {
      component,
      stateName,
      oldValue,
      newValue,
      timestamp: frontendLogger.getTimestamp(),
      ...metadata
    }
    frontendLogger.writeLog('INFO', `State Change: ${component} - ${stateName}`, stateData)
  },

  // Get logs from localStorage
  getLogs: () => {
    try {
      const logs = localStorage.getItem('frontend_logs')
      return logs ? JSON.parse(logs) : []
    } catch (error) {
      console.error('Failed to retrieve logs from localStorage:', error)
      return []
    }
  },

  // Clear logs from localStorage
  clearLogs: () => {
    try {
      localStorage.removeItem('frontend_logs')
      console.log('[FRONTEND-INFO] Frontend logs cleared')
    } catch (error) {
      console.error('Failed to clear logs from localStorage:', error)
    }
  }
}

// Performance monitoring
const monitorPerformance = () => {
  // Monitor page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const resource = performance.getEntriesByType('resource')
      
      frontendLogger.performance('page_load', navigation.loadEventEnd - navigation.navigationStart, {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ssl: navigation.secureConnectionStart > 0 ? navigation.connectEnd - navigation.secureConnectionStart : 0,
        ttfb: navigation.responseStart - navigation.requestStart,
        download: navigation.responseEnd - navigation.responseStart,
        dom_parse: navigation.domContentLoadedEventStart - navigation.responseEnd,
        dom_ready: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        load_complete: navigation.loadEventEnd - navigation.loadEventStart
      })
    }, 0)
  })

  // Monitor resource loading
  window.addEventListener('load', () => {
    const resources = performance.getEntriesByType('resource')
    resources.forEach(resource => {
      if (resource.duration > 1000) { // Log slow resources
        frontendLogger.performance('slow_resource', resource.duration, {
          name: resource.name,
          type: resource.initiatorType,
          size: resource.transferSize,
          cached: resource.transferSize === 0 && resource.decodedBodySize > 0
        })
      }
    })
  })

  // Monitor memory usage
  if (performance.memory) {
    setInterval(() => {
      frontendLogger.performance('memory_usage', performance.memory.usedJSHeapSize, {
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      })
    }, 30000) // Every 30 seconds
  }
}

// Start performance monitoring
monitorPerformance()

// Log initial page view
frontendLogger.pageView(window.location.pathname, {
  search: window.location.search,
  hash: window.location.hash
})

export default frontendLogger