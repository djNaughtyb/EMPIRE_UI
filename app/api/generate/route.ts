import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const GENERATION_COST = 10 // Credits per generation

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email ?? '' },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check credits
    if (user.credits < GENERATION_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      )
    }

    const body = await request.json()
    const { description } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Deduct credits
          await prisma.user.update({
            where: { id: user.id },
            data: { credits: user.credits - GENERATION_COST },
          })

          // Create transaction record
          await prisma.transaction.create({
            data: {
              userId: user.id,
              amount: 0,
              credits: -GENERATION_COST,
              type: 'usage',
              status: 'completed',
            },
          })

          // Generate code using LLM API
          const messages = [
            {
              role: 'system',
              content: `You are an expert NextJS developer. Generate complete, production-ready NextJS 14 application code based on user requirements. 

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "name": "app-name",
  "description": "Brief description",
  "files": [
    {
      "path": "app/page.tsx",
      "content": "...code here..."
    }
  ],
  "instructions": "Setup and deployment instructions"
}

Generate modern, beautiful UI with Tailwind CSS. Include all necessary files: pages, components, API routes, types, etc. Make it functional and complete. Respond with raw JSON only, no markdown or code blocks.`,
            },
            {
              role: 'user',
              content: `Generate a NextJS application: ${description}`,
            },
          ]

          const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4.1-mini',
              messages: messages,
              stream: true,
              max_tokens: 15000,
              response_format: { type: 'json_object' },
              temperature: 0.7,
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to generate code')
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('No response body')
          }

          const decoder = new TextDecoder()
          let buffer = ''
          let partialRead = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            partialRead += decoder.decode(value, { stream: true })
            let lines = partialRead.split('\n')
            partialRead = lines.pop() ?? ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  // Parse and return final JSON
                  try {
                    const finalResult = JSON.parse(buffer)
                    const finalData = JSON.stringify({
                      status: 'completed',
                      result: finalResult,
                    })
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
                  } catch (e) {
                    console.error('Failed to parse final JSON:', e)
                    const errorData = JSON.stringify({
                      status: 'error',
                      message: 'Failed to parse generated code',
                    })
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                  }
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  buffer += parsed.choices?.[0]?.delta?.content || ''
                  
                  // Stream progress updates
                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'Generating your application...',
                  })
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`))
                } catch (e) {
                  // Skip invalid JSON chunks
                }
              }
            }
          }
        } catch (error) {
          console.error('Generation error:', error)
          const errorData = JSON.stringify({
            status: 'error',
            message: error instanceof Error ? error.message : 'Generation failed',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
