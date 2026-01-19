'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Sparkles, Search } from 'lucide-react'
import { useState } from 'react'

// Mock showcase data - in production, fetch from database
const showcaseApps = [
  {
    id: 1,
    title: 'Modern SaaS Dashboard',
    category: 'Advanced Apps',
    description: 'Full-featured analytics platform with real-time data'
  },
  {
    id: 2,
    title: 'E-commerce Storefront',
    category: 'Landing Pages',
    description: 'Complete shopping experience with cart and checkout'
  },
  {
    id: 3,
    title: 'Task Management App',
    category: 'Essential Tools',
    description: 'Kanban-style project tracker with team collaboration'
  },
  {
    id: 4,
    title: 'Social Media Platform',
    category: 'Advanced Apps',
    description: 'Real-time chat, feeds, and user profiles'
  },
  {
    id: 5,
    title: 'Portfolio Website',
    category: 'Landing Pages',
    description: 'Minimal developer portfolio with project showcase'
  },
  {
    id: 6,
    title: 'Fitness Tracking App',
    category: 'Mobile Apps',
    description: 'Workout logger with progress charts and goals'
  },
]

const categories = ['All', 'Landing Pages', 'Advanced Apps', 'Essential Tools', 'Mobile Apps']

export default function Home() {
  const { data: session } = useSession() || {}
  const [selectedCategory, setSelectedCategory] = useState('All')

  if (session) {
    redirect('/dashboard')
  }

  const filteredApps = selectedCategory === 'All' 
    ? showcaseApps 
    : showcaseApps.filter(app => app.category === selectedCategory)

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-[0.3em]">E M P I R E</span>
              <span className="text-[9px] text-slate-400 tracking-tight">Enterprise Management Platform</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Start Building
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            Where ideas become reality
          </h1>
          <p className="text-xl text-gray-400">
            Build fully functional apps and websites through simple conversations
          </p>

          {/* Quick Start Buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            {[
              'Clone Template',
              'React Starter',
              'Landing Site',
              'Dashboard App',
            ].map((example) => (
              <Link
                key={example}
                href="/generate"
                className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all"
              >
                {example}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Search and Filters */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-3xl font-bold text-white">Showcase</h2>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20 text-sm"
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    selectedCategory === category
                      ? 'bg-white text-black'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* App Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => (
              <Link
                key={app.id}
                href="/generate"
                className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 hover:bg-white/10 transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative">
                  {/* Placeholder for image */}
                  <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm font-mono">
                    {app.title}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1 group-hover:text-blue-300 transition-colors">
                    {app.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">{app.description}</p>
                  <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-300 text-xs rounded">
                    {app.category}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Start building with
          </h2>
          <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
            EMPIRE TODAY
          </div>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors text-base font-semibold mt-6"
          >
            Start Building
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          © 2024 E M P I R E. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
