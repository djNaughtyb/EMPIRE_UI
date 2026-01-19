import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email ?? '' },
      select: { credits: true },
    })

    return NextResponse.json({ credits: user?.credits ?? 0 })
  } catch (error) {
    console.error('Failed to fetch credits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
