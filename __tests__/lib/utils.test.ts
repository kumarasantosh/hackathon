import { formatCurrency, calculateMatchScore, generateQuestionHash } from '@/lib/utils'

describe('formatCurrency', () => {
  it('should format currency in INR', () => {
    expect(formatCurrency(100)).toBe('₹100')
    expect(formatCurrency(50.5)).toBe('₹50.50')
    expect(formatCurrency(1000)).toBe('₹1,000')
  })
})

describe('calculateMatchScore', () => {
  it('should calculate match score correctly', () => {
    const studentPrefs = {
      subjects: ['Data Structures', 'Algorithms'],
      topics: ['Trees', 'Sorting'],
      times: ['Morning', 'Evening'],
    }

    const groupPrefs = {
      subjects: ['Data Structures'],
      topics: ['Trees'],
      times: ['Morning'],
    }

    const score = calculateMatchScore(studentPrefs, groupPrefs)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('should return higher score for better matches', () => {
    const studentPrefs = {
      subjects: ['Data Structures'],
      topics: ['Trees'],
      times: ['Morning'],
    }

    const perfectMatch = {
      subjects: ['Data Structures'],
      topics: ['Trees'],
      times: ['Morning'],
    }

    const partialMatch = {
      subjects: ['Algorithms'],
      topics: ['Sorting'],
      times: ['Evening'],
    }

    const perfectScore = calculateMatchScore(studentPrefs, perfectMatch)
    const partialScore = calculateMatchScore(studentPrefs, partialMatch)

    expect(perfectScore).toBeGreaterThan(partialScore)
  })
})

describe('generateQuestionHash', () => {
  it('should generate consistent hash for same question', async () => {
    const question = 'What is a binary tree?'
    const hash1 = await generateQuestionHash(question)
    const hash2 = await generateQuestionHash(question)

    expect(hash1).toBe(hash2)
  })

  it('should generate different hashes for different questions', async () => {
    const question1 = 'What is a binary tree?'
    const question2 = 'What is a linked list?'
    const hash1 = await generateQuestionHash(question1)
    const hash2 = await generateQuestionHash(question2)

    expect(hash1).not.toBe(hash2)
  })

  it('should handle case-insensitive hashing', async () => {
    const question1 = 'What is a binary tree?'
    const question2 = 'WHAT IS A BINARY TREE?'
    const hash1 = await generateQuestionHash(question1)
    const hash2 = await generateQuestionHash(question2)

    expect(hash1).toBe(hash2)
  })
})

