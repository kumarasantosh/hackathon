'use client'

import { CopyButton } from './CopyButton'

interface JoinCodeDisplayProps {
  joinCode: string
}

export function JoinCodeDisplay({ joinCode }: JoinCodeDisplayProps) {
  const joinLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/groups/join/${joinCode}`
    : `/groups/join/${joinCode}`

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">Join Code</p>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
          {joinCode}
        </code>
        <CopyButton text={joinLink} label="Copy Link" />
      </div>
    </div>
  )
}

