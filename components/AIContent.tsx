'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import type { Database } from '@/types/database'

type AIContent = Database['public']['Tables']['ai_generated_content']['Row']

interface AIContentProps {
  content: AIContent[]
}

export function AIContent({ content }: AIContentProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<Record<string, any>>({})

  const handleGenerate = async (resourceId: string, contentType: string) => {
    setLoading(contentType)
    try {
      const endpoint = contentType === 'quiz' 
        ? '/api/ai/generate-quiz'
        : contentType === 'summary'
        ? '/api/ai/generate-summary'
        : '/api/ai/generate-exam-questions'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resourceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setGeneratedContent({
        ...generatedContent,
        [contentType]: data[contentType] || data.questions || data.summary,
      })
    } catch (error) {
      alert('Failed to generate content')
    } finally {
      setLoading(null)
    }
  }

  const quizContent = content.find(c => c.content_type === 'quiz')
  const summaryContent = content.find(c => c.content_type === 'summary')
  const examQuestionsContent = content.find(c => c.content_type === 'exam_questions')
  const resourceId = content.length > 0 ? content[0].resource_id : ''

  return (
    <div className="space-y-8">
      {/* Quiz Section */}
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">AI-Generated Quiz</h2>
          {!quizContent && resourceId && (
            <Button
              onClick={() => handleGenerate(resourceId, 'quiz')}
              disabled={loading === 'quiz'}
            >
              {loading === 'quiz' ? 'Generating...' : 'Generate Quiz'}
            </Button>
          )}
        </div>
        {(quizContent || generatedContent.quiz) && (
          <div className="space-y-4">
            {(generatedContent.quiz || quizContent?.content)?.map((question: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <p className="font-semibold mb-2">{question.question}</p>
                <ul className="space-y-1 mb-2">
                  {question.options?.map((option: string, optIndex: number) => (
                    <li key={optIndex} className="text-gray-700">
                      {optIndex + 1}. {option}
                      {optIndex === question.correctAnswer && (
                        <span className="ml-2 text-green-600">✓</span>
                      )}
                    </li>
                  ))}
                </ul>
                {question.explanation && (
                  <p className="text-sm text-gray-600">{question.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Section */}
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">AI-Generated Summary</h2>
          {!summaryContent && resourceId && (
            <Button
              onClick={() => handleGenerate(resourceId, 'summary')}
              disabled={loading === 'summary'}
            >
              {loading === 'summary' ? 'Generating...' : 'Generate Summary'}
            </Button>
          )}
        </div>
        {(summaryContent || generatedContent.summary) && (
          <div className="space-y-2">
            {(generatedContent.summary?.summary || summaryContent?.content?.summary)?.map((point: string, index: number) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <p className="text-gray-700">{point}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exam Questions Section */}
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Top Exam Questions</h2>
          {!examQuestionsContent && resourceId && (
            <Button
              onClick={() => handleGenerate(resourceId, 'exam_questions')}
              disabled={loading === 'exam_questions'}
            >
              {loading === 'exam_questions' ? 'Generating...' : 'Generate Questions'}
            </Button>
          )}
        </div>
        {(examQuestionsContent || generatedContent.exam_questions) && (
          <div className="space-y-4">
            {(generatedContent.exam_questions || examQuestionsContent?.content)?.map((q: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold">{q.question}</p>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                    {q.marks || 'N/A'} marks
                  </span>
                </div>
                <p className="text-gray-700 mb-2">{q.answerSnippet}</p>
                <span className="text-sm text-gray-500">Difficulty: {q.difficulty}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

