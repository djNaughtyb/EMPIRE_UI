'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { motion } from 'framer-motion'
import { Plus, Clock, Code2, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  framework: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data?.projects ?? [])
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchProjects()
    }
  }, [status])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProjects(projects?.filter?.((p) => p?.id !== id) ?? [])
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, <span className="text-blue-400">{session?.user?.name ?? 'there'}</span>
          </h1>
          <p className="text-slate-400 text-lg">Ready to build something amazing?</p>
        </div>

        {/* Quick Action */}
        <Link href="/generate">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full mb-12 p-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between group hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <div className="text-left">
              <h2 className="text-2xl font-bold text-white mb-2">Generate New App</h2>
              <p className="text-gray-400">Describe your app idea and let AI build it for you</p>
            </div>
            <Plus className="w-12 h-12 text-gray-400 group-hover:text-white transition-colors" />
          </motion.button>
        </Link>

        {/* Projects Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Your Projects</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : projects?.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl">
              <Code2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-400 mb-2">No projects yet</h3>
              <p className="text-slate-500">Create your first AI-generated app to get started</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects?.map?.((project, index) => (
                <motion.div
                  key={project?.id ?? index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <Link href={`/projects/${project?.id ?? ''}`}>
                    <div className="p-6 bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10 h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <Code2 className="w-6 h-6 text-blue-400" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleDelete(project?.id ?? '')
                          }}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                        {project?.name ?? 'Untitled'}
                      </h3>
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                        {project?.description ?? 'No description'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {project?.createdAt
                            ? new Date(project.createdAt).toLocaleDateString()
                            : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )) ?? []}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
