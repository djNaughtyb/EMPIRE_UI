'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { motion } from 'framer-motion'
import { User, Mail, Calendar } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          setUser(data?.user ?? null)
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      }
    }

    if (status === 'authenticated') {
      fetchUser()
    }
  }, [status])

  if (status === 'loading' || status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400 text-lg">Manage your account settings</p>
        </div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-6"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Name</p>
                <p className="text-lg font-semibold text-white">
                  {session?.user?.name ?? 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-lg font-semibold text-white">
                  {session?.user?.email ?? 'Not set'}
                </p>
              </div>
            </div>

            {user?.createdAt && (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Member Since</p>
                  <p className="text-lg font-semibold text-white">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Account Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Account Statistics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-slate-400 mb-2">Total Projects</p>
              <p className="text-4xl font-bold text-white">{user?.projectCount ?? 0}</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-slate-400 mb-2">Credits Remaining</p>
              <p className="text-4xl font-bold text-white">{user?.credits ?? 0}</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
