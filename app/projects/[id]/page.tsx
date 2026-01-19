'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { motion } from 'framer-motion'
import { Download, Clock, Code2 } from 'lucide-react'
import JSZip from 'jszip'
import dynamic from 'next/dynamic'

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism as any),
  { ssr: false }
) as any
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface GeneratedFile {
  path: string
  content: string
}

interface GenerationResult {
  name: string
  description: string
  files: GeneratedFile[]
  instructions: string
}

interface Project {
  id: string
  name: string
  description: string
  generatedCode: string
  createdAt: string
  framework: string
}

export default function ProjectDetailPage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const params = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${params?.id ?? ''}`)
        if (response.ok) {
          const data = await response.json()
          setProject(data?.project ?? null)
          
          if (data?.project?.generatedCode) {
            const parsed = JSON.parse(data.project.generatedCode)
            setResult(parsed)
            setSelectedFile(parsed?.files?.[0] ?? null)
          }
        }
      } catch (error) {
        console.error('Failed to fetch project:', error)
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated' && params?.id) {
      fetchProject()
    }
  }, [status, params?.id])

  const handleDownload = async () => {
    if (!result) return

    const zip = new JSZip()

    if (result.files) {
      result.files.forEach((file) => {
        zip.file(file?.path ?? 'file.txt', file?.content ?? '')
      })
    }

    if (result.instructions) {
      zip.file('README.md', result.instructions)
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.name || 'project'}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (status === 'loading' || status === 'unauthenticated' || loading) {
    return null
  }

  if (!project || !result) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-slate-400 text-lg">Project not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{result.name}</h1>
                <p className="text-slate-400 mb-4">{result.description}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>
                    Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download ZIP
              </button>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/10">
              <div className="flex-1 overflow-x-auto">
                <div className="flex">
                  {result.files?.map?.((file, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedFile(file)}
                      className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedFile?.path === file?.path
                          ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {file?.path ?? 'File'}
                    </button>
                  )) ?? []}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {selectedFile && (
                <SyntaxHighlighter
                  language="typescript"
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    background: 'transparent',
                    fontSize: '0.875rem',
                  }}
                >
                  {selectedFile.content ?? ''}
                </SyntaxHighlighter>
              )}
            </div>
          </div>

          {/* Instructions */}
          {result.instructions && (
            <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                Setup Instructions
              </h3>
              <div className="prose prose-invert max-w-none">
                <pre className="text-slate-300 whitespace-pre-wrap text-sm">
                  {result.instructions}
                </pre>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
