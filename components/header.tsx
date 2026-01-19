'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Sparkles, LogOut, Settings, Coins } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Header() {
  const { data: session } = useSession() || {}
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch('/api/user/credits')
        if (response.ok) {
          const data = await response.json()
          setCredits(data?.credits ?? 0)
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error)
      }
    }

    if (session) {
      fetchCredits()
    }
  }, [session])

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-[0.3em]">E M P I R E</span>
            <span className="text-[9px] text-slate-400 tracking-tight">Enterprise Management Platform</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/credits"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
          >
            <Coins className="w-4 h-4" />
            <span>{credits ?? '...'}</span>
          </Link>

          <Link
            href="/settings"
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
