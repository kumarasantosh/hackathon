import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY!

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in environment variables')
}

const genAI = new GoogleGenerativeAI(apiKey)

export const getGeminiModel = (modelName: string = 'gemini-pro') => {
  return genAI.getGenerativeModel({ model: modelName })
}

// Prompt templates
export const promptTemplates = {
  generateQuiz: (resourceText: string, numQuestions: number = 5) => `
Generate ${numQuestions} quiz questions based on the following study material. Return a JSON array with this structure:
[
  {
    "question": "question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": 0,
    "explanation": "brief explanation"
  }
]

Study Material:
${resourceText}

Return only valid JSON, no markdown formatting.
`,

  generateFlashcards: (resourceText: string, numCards: number = 10) => `
Generate ${numCards} flashcards from the following study material. Return a JSON array with this structure:
[
  {
    "front": "question or term",
    "back": "answer or definition"
  }
]

Study Material:
${resourceText}

Return only valid JSON, no markdown formatting.
`,

  summarizeNotes: (resourceText: string) => `
Summarize the following study notes into 6-8 key bullet points for quick revision. Return a JSON object with this structure:
{
  "summary": [
    "bullet point 1",
    "bullet point 2",
    ...
  ],
  "keyTerms": ["term1", "term2", ...]
}

Study Notes:
${resourceText}

Return only valid JSON, no markdown formatting.
`,

  generateExamQuestions: (resourceText: string, subject: string) => `
Based on the following study material for ${subject}, generate the top 5 most likely exam questions with model answer snippets. Return a JSON array with this structure:
[
  {
    "question": "exam question text",
    "answerSnippet": "key points for the answer",
    "marks": "estimated marks",
    "difficulty": "easy|medium|hard"
  }
]

Study Material:
${resourceText}

Return only valid JSON, no markdown formatting.
`,

  matchStudyGroups: (studentPreferences: {
    subjects: string[]
    topics: string[]
    preferredTimes: string[]
    studyPace: string
    meetingType: string
  }) => `
Match a student with study groups based on their preferences. Return a JSON array with this structure:
[
  {
    "groupId": "group-id",
    "matchScore": 0.85,
    "reason": "why this is a good match",
    "bestMeetingTime": "suggested meeting time",
    "commonSubjects": ["subject1", "subject2"],
    "groupSize": 5,
    "availableSpots": 3
  }
]

Student Preferences:
- Subjects: ${studentPreferences.subjects.join(', ')}
- Topics: ${studentPreferences.topics.join(', ')}
- Preferred Times: ${studentPreferences.preferredTimes.join(', ')}
- Study Pace: ${studentPreferences.studyPace}
- Meeting Type: ${studentPreferences.meetingType}

Return only valid JSON, no markdown formatting.
`,
}

export async function generateAIResponse(
  prompt: string,
  modelName: string = 'gemini-pro'
): Promise<string> {
  try {
    const model = getGeminiModel(modelName)
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Error generating AI response:', error)
    throw new Error('Failed to generate AI response')
  }
}

export async function parseAIJSONResponse<T>(response: string): Promise<T> {
  try {
    // Remove markdown code blocks if present
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as T
  } catch (error) {
    console.error('Error parsing AI JSON response:', error)
    console.error('Response:', response)
    throw new Error('Failed to parse AI response as JSON')
  }
}

