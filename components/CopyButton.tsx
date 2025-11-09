'use client'

import { Button } from './ui/Button'
import { useState } from 'react'

interface CopyButtonProps {
  text: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
}

export function CopyButton({ text, label = 'Copy', size = 'sm', variant = 'outline' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy to clipboard')
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleCopy}
      className="text-xs"
    >
      {copied ? 'Copied!' : label}
    </Button>
  )
}

