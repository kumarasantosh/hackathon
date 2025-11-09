import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { generateAIResponse, parseAIJSONResponse, promptTemplates } from '@/lib/gemini'
import { calculateMatchScore } from '@/lib/utils'

interface GroupMatch {
  groupId: string
  matchScore: number
  reason: string
  bestMeetingTime: string
  commonSubjects: string[]
  groupSize: number
  availableSpots: number
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { subjects, topics, preferredTimes, studyPace, meetingType } = body

    // Fetch all active study groups
    const { data: studyGroups, error: groupsError } = await supabase
      .from('study_groups')
      .select(`
        *,
        subjects (*),
        members:study_group_members (user_id)
      `)
      .eq('is_active', true)

    if (groupsError) {
      return NextResponse.json(
        { error: 'Failed to fetch study groups' },
        { status: 500 }
      )
    }

    // Calculate match scores for each group
    const matches: GroupMatch[] = studyGroups.map((group: any) => {
      const groupSubjects = group.subjects ? [group.subjects.name] : []
      const groupTopics = group.topic ? [group.topic] : []
      const groupTimes = group.preferred_time_slots || []

      const matchScore = calculateMatchScore(
        { subjects: subjects || [], topics: topics || [], times: preferredTimes || [] },
        { subjects: groupSubjects, topics: groupTopics, times: groupTimes }
      )

      const memberCount = group.members?.length || 0
      const availableSpots = Math.max(0, group.max_members - memberCount)

      return {
        groupId: group.id,
        matchScore,
        reason: `Matches ${groupSubjects.length} subjects, ${groupTopics.length} topics`,
        bestMeetingTime: groupTimes[0] || 'To be decided',
        commonSubjects: groupSubjects.filter((s: string) => 
          (subjects || []).some((us: string) => us.toLowerCase().includes(s.toLowerCase()))
        ),
        groupSize: memberCount,
        availableSpots,
      }
    })

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore)

    // Use AI to enhance matches if Gemini is available
    try {
      const aiPrompt = promptTemplates.matchStudyGroups({
        subjects: subjects || [],
        topics: topics || [],
        preferredTimes: preferredTimes || [],
        studyPace: studyPace || 'moderate',
        meetingType: meetingType || 'virtual',
      })
      const aiResponse = await generateAIResponse(aiPrompt)
      const aiMatches = await parseAIJSONResponse<GroupMatch[]>(aiResponse)
      
      // Merge AI insights with calculated matches
      const enhancedMatches = matches.map(match => {
        const aiMatch = aiMatches.find((am: any) => am.groupId === match.groupId)
        if (aiMatch) {
          return {
            ...match,
            reason: aiMatch.reason || match.reason,
            bestMeetingTime: aiMatch.bestMeetingTime || match.bestMeetingTime,
          }
        }
        return match
      })

      return NextResponse.json({ 
        matches: enhancedMatches.slice(0, 10) // Return top 10 matches
      }, { status: 200 })
    } catch (aiError) {
      // If AI fails, return calculated matches
      console.error('AI matching failed, using calculated matches:', aiError)
      return NextResponse.json({ 
        matches: matches.slice(0, 10)
      }, { status: 200 })
    }
  } catch (error) {
    console.error('Error matching study groups:', error)
    return NextResponse.json(
      { error: 'Failed to match study groups', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

