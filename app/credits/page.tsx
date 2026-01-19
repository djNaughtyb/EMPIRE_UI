'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { motion } from 'framer-motion'
import { Coins, Zap, ShoppingCart } from 'lucide-react'

export default function CreditsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

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

    if (status === 'authenticated') {
      fetchCredits()
    }
  }, [status])

  const handlePurchase = async (amount: number, price: number, creditsAmount: number) => {
    setLoading(true)
    try {
      const response = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, price, credits: creditsAmount }),
      })

      const data = await response.json()
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Coins className="w-10 h-10 text-blue-400" />
            Credits
          </h1>
          <p className="text-slate-400 text-lg">Purchase credits to generate more apps</p>
        </div>

        {/* Current Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-lg p-8 mb-12"
        >
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-2">Your Current Balance</p>
            <p className="text-6xl font-bold text-white mb-2">
              {credits ?? '...'}
            </p>
            <p className="text-gray-400">credits available</p>
          </div>
        </motion.div>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              name: 'Starter Pack',
              credits: 500,
              price: 29,
              perApp: '~50 apps',
              popular: false,
            },
            {
              name: 'Pro Pack',
              credits: 2000,
              price: 99,
              perApp: '~200 apps',
              popular: true,
            },
            {
              name: 'Enterprise Pack',
              credits: 5000,
              price: 199,
              perApp: '~500 apps',
              popular: false,
            },
          ].map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-8 rounded-2xl border ${
                plan.popular
                  ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/50 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900/50 border-white/10'
              } relative`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-sm font-semibold rounded-full">
                  Best Value
                </div>
              )}
              <div className="text-center mb-6">
                <Zap className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-white">${plan.price}</span>
                </div>
                <div className="text-blue-400 font-semibold text-xl mb-2">
                  {plan.credits} credits
                </div>
                <div className="text-slate-400 text-sm">{plan.perApp}</div>
              </div>
              <button
                onClick={() => handlePurchase(plan.price, plan.price, plan.credits)}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-white text-black hover:bg-gray-200'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ShoppingCart className="w-4 h-4" />
                Purchase Now
              </button>
            </motion.div>
          ))}
        </div>

        {/* Info */}
        <div className="mt-12 bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How Credits Work</h3>
          <ul className="space-y-2 text-slate-400">
            <li>• Each app generation costs 10 credits</li>
            <li>• Credits never expire</li>
            <li>• Download generated code as many times as you want</li>
            <li>• Full ownership of all generated code</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
