import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { generateAIResponse, parseAIJSONResponse, promptTemplates } from '@/lib/gemini'

interface ExamQuestion {
  question: string
  answerSnippet: string
  marks: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    const { resourceId } = body

    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      )
    }

    // Get resource with subject
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select(`
        *,
        subjects (*)
      `)
      .eq('id', resourceId)
      .single()

    if (resourceError || !resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Check if exam questions already exist
    const { data: existingQuestions } = await supabase
      .from('ai_generated_content')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('content_type', 'exam_questions')
      .single()

    if (existingQuestions) {
      return NextResponse.json({ 
        questions: existingQuestions.content,
        cached: true 
      }, { status: 200 })
    }

    // For demo purposes, we'll use the resource description
    const resourceText = resource.description || resource.title
    const subjectName = (resource.subjects as any)?.name || 'General'

    // Generate exam questions using Gemini
    const prompt = promptTemplates.generateExamQuestions(resourceText, subjectName)
    const aiResponse = await generateAIResponse(prompt)
    const questions = await parseAIJSONResponse<ExamQuestion[]>(aiResponse)

    // Store in database
    const { data: aiContent, error: storeError } = await supabase
      .from('ai_generated_content')
      .insert({
        resource_id: resourceId,
        content_type: 'exam_questions',
        content: questions,
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing AI content:', storeError)
    }

    return NextResponse.json({ 
      questions,
      cached: false 
    }, { status: 200 })
  } catch (error) {
    console.error('Error generating exam questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate exam questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

