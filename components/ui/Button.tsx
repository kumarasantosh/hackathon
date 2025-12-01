import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const baseStyles = 'rounded-md font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  
  const variants = {
    primary: 'bg-black text-white hover:bg-gray-800 focus:ring-gray-500 shadow-sm',
    outline: 'bg-gray-100 text-black hover:bg-gray-200 focus:ring-gray-300 border-0',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
}

