import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  href?: string
  fullWidth?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  className,
  href,
  fullWidth = false,
  ...rest
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]'

  const variantClasses = {
    primary: 'bg-bdo-red hover:bg-red-700 text-white shadow-md hover:shadow-lg focus:ring-bdo-red',
    secondary: 'bg-bdo-navy hover:bg-blue-800 text-white shadow-md focus:ring-bdo-navy',
    outline: 'border-2 border-bdo-blue text-bdo-blue hover:bg-blue-50 focus:ring-bdo-blue',
    tertiary: 'bg-gray-100 hover:bg-gray-200 text-bdo-navy focus:ring-gray-400'
  }

  const sizeClasses = {
    sm: 'h-9 px-3.5 text-sm',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-base'
  }

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    className
  )

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    )
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      ref={ref}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
