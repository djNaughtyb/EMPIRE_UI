'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Header } from '@/components/header'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Download, Save, ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, Loader2, CheckCircle2, Code2 } from 'lucide-react'
import JSZip from 'jszip'
import dynamic from 'next/dynamic'

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

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

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

type AgentStatus = 'idle' | 'planning' | 'designing' | 'coding' | 'reviewing' | 'completed'

export default function GeneratePage() {
  const { data: session, status } = useSession() || {}
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (result?.files) {
      const tree = buildFileTree(result.files)
      setFileTree(tree)
      
      // Expand all folders by default
      const allFolders = new Set<string>()
      const addFolders = (nodes: FileNode[]) => {
        nodes.forEach(node => {
          if (node.type === 'folder') {
            allFolders.add(node.path)
            if (node.children) addFolders(node.children)
          }
        })
      }
      addFolders(tree)
      setExpandedFolders(allFolders)

      if (!selectedFile && result.files.length > 0) {
        setSelectedFile(result.files[0])
      }
    }
  }, [result])

  const buildFileTree = (files: GeneratedFile[]): FileNode[] => {
    const root: FileNode[] = []
    const folderMap = new Map<string, FileNode>()

    files.forEach(file => {
      const parts = file.path.split('/')
      let currentPath = ''
      
      parts.forEach((part, index) => {
        const previousPath = currentPath
        currentPath = currentPath ? `${currentPath}/${part}` : part
        
        if (index === parts.length - 1) {
          // File
          const fileNode: FileNode = {
            name: part,
            path: currentPath,
            type: 'file'
          }
          
          if (previousPath) {
            const parent = folderMap.get(previousPath)
            if (parent && parent.children) {
              parent.children.push(fileNode)
            }
          } else {
            root.push(fileNode)
          }
        } else {
          // Folder
          if (!folderMap.has(currentPath)) {
            const folderNode: FileNode = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: []
            }
            folderMap.set(currentPath, folderNode)
            
            if (previousPath) {
              const parent = folderMap.get(previousPath)
              if (parent && parent.children) {
                parent.children.push(folderNode)
              }
            } else {
              root.push(folderNode)
            }
          }
        }
      })
    })

    return root
  }

  const handleGenerate = async () => {
    if (!description.trim()) return

    setGenerating(true)
    setError('')
    setResult(null)
    setAgentStatus('planning')

    try {
      console.log('Starting generation for:', description)
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const data = await response.json()
        console.error('API error:', data)
        throw new Error(data.error || 'Generation failed')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let partialRead = ''
      let statusCounter = 0
      let hasReceivedData = false

      // Simulate agent progression
      const statusInterval = setInterval(() => {
        statusCounter++
        if (statusCounter === 2) setAgentStatus('designing')
        else if (statusCounter === 4) setAgentStatus('coding')
        else if (statusCounter === 6) setAgentStatus('reviewing')
      }, 2000)

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Stream ended')
          if (!hasReceivedData) {
            clearInterval(statusInterval)
            throw new Error('Stream ended without receiving data')
          }
          break
        }

        partialRead += decoder.decode(value, { stream: true })
        let lines = partialRead.split('\n')
        partialRead = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') {
              console.log('Received [DONE] signal')
              clearInterval(statusInterval)
              continue
            }

            try {
              const parsed = JSON.parse(data)
              console.log('Parsed data:', parsed.status)
              hasReceivedData = true
              
              if (parsed.status === 'completed' && parsed.result) {
                console.log('Generation completed!', parsed.result)
                clearInterval(statusInterval)
                setResult(parsed.result)
                setSelectedFile(parsed.result?.files?.[0] ?? null)
                setAgentStatus('completed')
                setGenerating(false)
                return
              } else if (parsed.status === 'error') {
                clearInterval(statusInterval)
                throw new Error(parsed.message || 'Generation failed')
              } else if (parsed.status === 'processing') {
                console.log('Processing:', parsed.message)
              }
            } catch (e) {
              if (e instanceof Error && !e.message.includes('Unexpected end of JSON input')) {
                console.error('Parse error:', e)
                clearInterval(statusInterval)
                throw e
              }
            }
          }
        }
      }
      
      // If we exit the loop without returning, something went wrong
      if (!hasReceivedData) {
        throw new Error('No data received from server')
      }
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setAgentStatus('idle')
    } finally {
      setGenerating(false)
    }
  }

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

  const handleSave = async () => {
    if (!result) return

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.name,
          description: result.description,
          generatedCode: JSON.stringify(result),
        }),
      })

      if (response.ok) {
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Failed to save project:', err)
    }
  }

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        {node.type === 'folder' ? (
          <>
            <button
              onClick={() => toggleFolder(node.path)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 transition-colors"
              style={{ paddingLeft: `${depth * 12 + 12}px` }}
            >
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              {expandedFolders.has(node.path) ? (
                <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-400" />
              ) : (
                <Folder className="w-4 h-4 flex-shrink-0 text-blue-400" />
              )}
              <span>{node.name}</span>
            </button>
            {expandedFolders.has(node.path) && node.children && (
              <div>{renderFileTree(node.children, depth + 1)}</div>
            )}
          </>
        ) : (
          <button
            onClick={() => {
              const file = result?.files?.find(f => f.path === node.path)
              if (file) setSelectedFile(file)
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
              selectedFile?.path === node.path
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:bg-white/5'
            }`}
            style={{ paddingLeft: `${depth * 12 + 28}px` }}
          >
            <FileCode className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{node.name}</span>
          </button>
        )}
      </div>
    ))
  }

  const getAgentStatusInfo = () => {
    switch (agentStatus) {
      case 'planning':
        return { text: 'Planning Agent', color: 'text-blue-400', icon: Loader2 }
      case 'designing':
        return { text: 'Design Agent', color: 'text-purple-400', icon: Loader2 }
      case 'coding':
        return { text: 'Coding Agent', color: 'text-green-400', icon: Loader2 }
      case 'reviewing':
        return { text: 'Quality Agent', color: 'text-yellow-400', icon: Loader2 }
      case 'completed':
        return { text: 'Completed', color: 'text-green-400', icon: CheckCircle2 }
      default:
        return null
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return null
  }

  const statusInfo = getAgentStatusInfo()

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col">
      <Header />

      {/* Centered Layout (Bolt.new style) */}
      <div className="flex-1 overflow-hidden">
        {/* Main Content Area - Centered */}
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
            {!result && !generating ? (
              <div className="w-full max-w-2xl space-y-6">
                {/* Hero Text */}
                <div className="text-center space-y-3">
                  <h1 className="text-4xl font-semibold text-white">
                    Where ideas become reality
                  </h1>
                  <p className="text-gray-500 text-lg">
                    Build fully functional apps and websites through simple conversations
                  </p>
                </div>

                {/* Input Field - Large */}
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Build me a clone"
                    className="w-full h-32 px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all resize-none text-lg"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={generating || !description.trim()}
                    className="absolute bottom-4 right-4 p-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Example Buttons - Horizontal */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { label: 'SaaS Dashboard', prompt: 'Build a SaaS dashboard with user analytics, billing integration, and team management' },
                    { label: 'E-commerce Store', prompt: 'Create an e-commerce platform with product catalog, shopping cart, and checkout' },
                    { label: 'Project Management Tool', prompt: 'Build a project management app with kanban boards, task assignments, and time tracking' },
                    { label: 'Social Media App', prompt: 'Create a social media platform with user profiles, posts, comments, and real-time notifications' },
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setDescription(example.prompt)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-white transition-all"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {generating && (
              <div className="w-full max-w-2xl space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-white">{description}</p>
                </div>

                {statusInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3"
                  >
                    <statusInfo.icon className={`w-5 h-5 ${statusInfo.color} animate-spin`} />
                    <span className={`${statusInfo.color} text-sm`}>{statusInfo.text}</span>
                  </motion.div>
                )}
              </div>
            )}

            {result && (
              <div className="w-full max-w-2xl space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-white mb-3">{description}</p>
                  
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Generated successfully</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-white mb-2">{result.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">{result.description}</p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-white text-black text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save to Projects
                    </button>
                  </div>
                </div>

                {result.instructions && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Code2 className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-semibold text-white">Setup Instructions</h4>
                    </div>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
                      {result.instructions}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="w-full max-w-2xl">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Code Viewer - Shows after generation */}
            {result && selectedFile && (
              <div className="w-full max-w-6xl mt-6">
                <div className="bg-[#1e1e1e] rounded-lg border border-white/10 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <FileCode className="w-4 h-4" />
                      <span>{selectedFile.path}</span>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Code Editor */}
                  <div className="h-96">
                    <Editor
                      height="100%"
                      defaultLanguage="typescript"
                      value={selectedFile.content}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* File Tree - Shows after generation */}
            {result && fileTree.length > 0 && !selectedFile && (
              <div className="w-full max-w-2xl mt-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-semibold text-white">View Generated Code</h4>
                  </div>
                  <div className="space-y-1">
                    {renderFileTree(fileTree)}
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
