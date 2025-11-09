import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export async function generateQuestionHash(questionText: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(questionText.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function calculateMatchScore(
  studentPrefs: { subjects: string[]; topics: string[]; times: string[] },
  groupPrefs: { subjects: string[]; topics: string[]; times: string[] }
): number {
  let score = 0
  let total = 0

  // Subject matching (40% weight)
  const subjectMatches = studentPrefs.subjects.filter(s => 
    groupPrefs.subjects.some(gs => gs.toLowerCase().includes(s.toLowerCase()))
  ).length
  score += (subjectMatches / Math.max(studentPrefs.subjects.length, 1)) * 0.4
  total += 0.4

  // Topic matching (30% weight)
  const topicMatches = studentPrefs.topics.filter(t => 
    groupPrefs.topics.some(gt => gt.toLowerCase().includes(t.toLowerCase()))
  ).length
  score += (topicMatches / Math.max(studentPrefs.topics.length, 1)) * 0.3
  total += 0.3

  // Time matching (30% weight)
  const timeMatches = studentPrefs.times.filter(t => 
    groupPrefs.times.some(gt => gt.toLowerCase().includes(t.toLowerCase()))
  ).length
  score += (timeMatches / Math.max(studentPrefs.times.length, 1)) * 0.3
  total += 0.3

  return Math.min(score / total, 1)
}

