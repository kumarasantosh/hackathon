import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { generateAIResponse, parseAIJSONResponse, promptTemplates } from '@/lib/gemini'

interface Summary {
  summary: string[]
  keyTerms: string[]
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

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('ai_generated_content')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('content_type', 'summary')
      .single()

    if (existingSummary) {
      return NextResponse.json({ 
        summary: existingSummary.content,
        cached: true 
      }, { status: 200 })
    }

    // For demo purposes, we'll use the resource description
    const resourceText = resource.description || resource.title

    // Generate summary using Gemini
    const prompt = promptTemplates.summarizeNotes(resourceText)
    const aiResponse = await generateAIResponse(prompt)
    const summary = await parseAIJSONResponse<Summary>(aiResponse)

    // Store in database
    const { data: aiContent, error: storeError } = await supabase
      .from('ai_generated_content')
      .insert({
        resource_id: resourceId,
        content_type: 'summary',
        content: summary,
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing AI content:', storeError)
    }

    return NextResponse.json({ 
      summary,
      cached: false 
    }, { status: 200 })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

