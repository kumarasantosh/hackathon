import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { generateAIResponse, parseAIJSONResponse, promptTemplates } from '@/lib/gemini'

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    const { resourceId, numQuestions = 5 } = body

    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      )
    }

    // Get resource
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Check if quiz already exists
    const { data: existingQuiz } = await supabase
      .from('ai_generated_content')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('content_type', 'quiz')
      .single()

    if (existingQuiz) {
      return NextResponse.json({ 
        quiz: existingQuiz.content,
        cached: true 
      }, { status: 200 })
    }

    // For demo purposes, we'll use the resource description
    // In production, you would fetch and parse the actual file content
    const resourceText = resource.description || resource.title

    // Generate quiz using Gemini
    const prompt = promptTemplates.generateQuiz(resourceText, numQuestions)
    const aiResponse = await generateAIResponse(prompt)
    const quiz = await parseAIJSONResponse<QuizQuestion[]>(aiResponse)

    // Store in database
    const { data: aiContent, error: storeError } = await supabase
      .from('ai_generated_content')
      .insert({
        resource_id: resourceId,
        content_type: 'quiz',
        content: quiz,
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing AI content:', storeError)
      // Still return the quiz even if storage fails
    }

    return NextResponse.json({ 
      quiz,
      cached: false 
    }, { status: 200 })
  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

