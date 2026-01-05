import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Highlight, themes } from 'prism-react-renderer'
import { Panel, Group, Separator } from 'react-resizable-panels'
import './App.css'

interface GitHubFile {
  name: string
  path: string
  type: 'file' | 'dir'
  download_url: string | null
}

interface FileTreeItem {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileTreeItem[]
}

interface Language {
  value: string
  label: string
  extensions: string[]
}

const GITHUB_OWNER = 'bahcate06'
const GITHUB_URL = 'https://github.com/bahcate06'

const LANGUAGES: Language[] = [
  { value: 'python3', label: 'Python 3', extensions: ['.py'] },
  { value: 'java', label: 'Java', extensions: ['.java'] },
  { value: 'c', label: 'C', extensions: ['.c', '.h'] },
  { value: 'cpp17', label: 'C++ 17', extensions: ['.cpp', '.cc', '.cxx', '.hpp'] },
  { value: 'nodejs', label: 'JavaScript', extensions: ['.js'] },
  { value: 'ruby', label: 'Ruby', extensions: ['.rb'] },
  { value: 'go', label: 'Go', extensions: ['.go'] },
  { value: 'rust', label: 'Rust', extensions: ['.rs'] },
  { value: 'php', label: 'PHP', extensions: ['.php'] },
]

// Map file extensions to Prism language names
const PRISM_LANGUAGES: Record<string, string> = {
  '.py': 'python',
  '.java': 'c', // Java not in bundle, using C syntax
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.jsx': 'jsx',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.html': 'html',
  '.css': 'css',
  '.json': 'json',
  '.md': 'markdown',
  '.sql': 'sql',
  '.sh': 'bash',
  '.yml': 'yaml',
  '.yaml': 'yaml',
}

function App() {
  const { repo } = useParams<{ repo: string }>()

  const [files, setFiles] = useState<FileTreeItem[]>([])
  const [activeFile, setActiveFile] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [readme, setReadme] = useState<string>('')
  const [input, setInput] = useState<string>('')
  const [output, setOutput] = useState<string>('')
  const [language, setLanguage] = useState<Language>(LANGUAGES[0])
  const [prismLanguage, setPrismLanguage] = useState<string>('python')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const codeRef = useRef<HTMLDivElement>(null)

  // Panel states
  const [codeFontSize, setCodeFontSize] = useState<number>(13)
  const [hiddenPanels, setHiddenPanels] = useState<Set<string>>(new Set())

  const togglePanel = (panelId: string) => {
    setHiddenPanels(prev => {
      const next = new Set(prev)
      if (next.has(panelId)) {
        next.delete(panelId)
      } else {
        next.add(panelId)
      }
      return next
    })
  }

  const isPanelHidden = (panelId: string) => hiddenPanels.has(panelId)

  const PANEL_LABELS: Record<string, string> = {
    code: 'Code',
    readme: 'README',
    input: 'Input',
    output: 'Output',
  }

  const PANEL_ICONS: Record<string, React.ReactNode> = {
    code: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>,
    readme: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
    input: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16M12 4v16"/></svg>,
    output: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16m-7-7l7 7-7 7"/></svg>,
  }

  const autoFitCode = useCallback(() => {
    if (!codeRef.current || !code) return

    const container = codeRef.current
    const lineCount = code.split('\n').length
    const containerHeight = container.clientHeight - 32 // padding

    // Calculate optimal font size to fit all lines
    const optimalLineHeight = containerHeight / lineCount
    const optimalFontSize = Math.min(Math.max(optimalLineHeight / 1.6, 8), 16)

    setCodeFontSize(Math.round(optimalFontSize))
  }, [code])

  // Get Prism language from filename
  const getPrismLanguage = (filename: string): string => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase()
    return PRISM_LANGUAGES[ext] || 'plaintext'
  }

  // Detect language from file extension
  const detectLanguage = (filename: string): Language => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase()
    for (const lang of LANGUAGES) {
      if (lang.extensions.includes(ext)) {
        return lang
      }
    }
    return LANGUAGES[0]
  }

  // Fetch repository contents
  useEffect(() => {
    const fetchRepoContents = async () => {
      if (!repo) return
      setIsLoading(true)

      try {
        // Fetch root contents
        const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents`)
        if (!response.ok) throw new Error('Failed to fetch repository')
        const data: GitHubFile[] = await response.json()

        // Build file tree
        const buildTree = async (items: GitHubFile[]): Promise<FileTreeItem[]> => {
          const tree: FileTreeItem[] = []

          for (const item of items) {
            if (item.type === 'dir') {
              // Fetch folder contents
              const folderResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/${item.path}`)
              const folderData: GitHubFile[] = await folderResponse.json()
              tree.push({
                name: item.name,
                path: item.path,
                type: 'folder',
                children: await buildTree(folderData)
              })
            } else {
              tree.push({
                name: item.name,
                path: item.path,
                type: 'file'
              })
            }
          }

          return tree
        }

        const fileTree = await buildTree(data)
        setFiles(fileTree)

        // Fetch README if exists
        const readmeFile = data.find(f => f.name.toLowerCase() === 'readme.md')
        if (readmeFile && readmeFile.download_url) {
          const readmeResponse = await fetch(readmeFile.download_url)
          const readmeContent = await readmeResponse.text()
          setReadme(readmeContent)
        }

        // Select first code file automatically
        const findFirstCodeFile = (items: FileTreeItem[]): FileTreeItem | null => {
          for (const item of items) {
            if (item.type === 'file') {
              const ext = '.' + item.name.split('.').pop()?.toLowerCase()
              if (LANGUAGES.some(l => l.extensions.includes(ext))) {
                return item
              }
            }
            if (item.type === 'folder' && item.children) {
              const found = findFirstCodeFile(item.children)
              if (found) return found
            }
          }
          return null
        }

        const firstCodeFile = findFirstCodeFile(fileTree)
        if (firstCodeFile) {
          setActiveFile(firstCodeFile.path)
          fetchFileContent(firstCodeFile.path, firstCodeFile.name)
        }

      } catch (error) {
        console.error('Error fetching repository:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRepoContents()
  }, [repo])

  // Fetch file content
  const fetchFileContent = async (path: string, filename: string) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/${path}`)
      const data = await response.json()

      if (data.content) {
        const content = atob(data.content)
        setCode(content)
        setLanguage(detectLanguage(filename))
        setPrismLanguage(getPrismLanguage(filename))
      }
    } catch (error) {
      console.error('Error fetching file:', error)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderName)) {
        next.delete(folderName)
      } else {
        next.add(folderName)
      }
      return next
    })
  }

  const handleLogoClick = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      window.location.href = GITHUB_URL
    }, 1200)
  }

  const handleRun = async () => {
    setIsRunning(true)
    setOutput('Running...')

    // Restore output panel if hidden
    if (isPanelHidden('output')) {
      togglePanel('output')
    }

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: code,
          stdin: input,
          language: language.value,
          versionIndex: '0',
        }),
      })

      const data = await response.json()

      if (data.error) {
        setOutput(`Error: ${data.error}`)
      } else if (data.output !== undefined && data.output !== null) {
        // Detect if program failed due to missing input
        const inputErrorPatterns = [
          /NoSuchElementException/i,
          /No line found/i,
          /EOF when reading/i,
          /EOFError/i,
          /expected input/i,
          /Scanner.*Exception/i,
          /InputMismatchException/i,
          /nextLine|nextInt|next\(\)/i,
          /readline\(\)/i,
          /input\(\)/i,
          /cin >>/i,
          /scanf/i,
          /BufferedReader/i,
        ]

        const needsInput = !input.trim() &&
          data.isExecutionSuccess === false &&
          inputErrorPatterns.some(pattern => pattern.test(data.output))

        if (needsInput) {
          setOutput(
            `${data.output}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚠️  This program requires user input!\n\n` +
            `Since execution is not interactive, you need to\n` +
            `provide all input BEFORE running:\n\n` +
            `1. Enter values in the "Input" panel (on the right)\n` +
            `2. Put each input on a separate line\n` +
            `3. Click "Run Code" again\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
          )
        } else {
          setOutput(data.output)
        }
      } else {
        setOutput('No output')
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Failed to execute code'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
  }

  const FileIcon = ({ type, isOpen }: { type: 'file' | 'folder', isOpen?: boolean }) => (
    <svg className="file-icon" viewBox="0 0 24 24" fill="currentColor">
      {type === 'folder' ? (
        isOpen ? (
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"/>
        ) : (
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        )
      ) : (
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4z"/>
      )}
    </svg>
  )

  const ChevronIcon = () => (
    <motion.svg
      className="chevron-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      animate={{ rotate: dropdownOpen ? 180 : 0 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      <path d="M6 9l6 6 6-6"/>
    </motion.svg>
  )

  const FolderChevron = ({ isOpen }: { isOpen: boolean }) => (
    <motion.svg
      className="folder-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      animate={{ rotate: isOpen ? 90 : 0 }}
      transition={{ duration: 0.3, type: "spring" }}
    >
      <path d="M9 6l6 6-6 6"/>
    </motion.svg>
  )

  const handleFileClick = (item: FileTreeItem) => {
    if (item.type === 'folder') {
      toggleFolder(item.path)
    } else {
      setActiveFile(item.path)
      fetchFileContent(item.path, item.name)
    }
  }

  const renderFileTree = (items: FileTreeItem[], depth = 0) => (
    <ul className="file-list" style={{ paddingLeft: depth * 12 }}>
      {items.map((item, index) => {
        const isFolder = item.type === 'folder'
        const isOpen = expandedFolders.has(item.path)

        return (
          <motion.li
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index, type: "spring", stiffness: 200, damping: 20 }}
          >
            <motion.button
              className={`file-item ${activeFile === item.path ? 'active' : ''} ${isFolder ? 'folder' : ''}`}
              onClick={() => handleFileClick(item)}
              whileHover={{ x: 6, backgroundColor: 'var(--bg2)', scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {isFolder && <FolderChevron isOpen={isOpen} />}
              <motion.span
                whileHover={{ scale: 1.15, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <FileIcon type={item.type} isOpen={isOpen} />
              </motion.span>
              <span>{item.name}</span>
            </motion.button>
            <AnimatePresence>
              {isFolder && isOpen && item.children && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  {renderFileTree(item.children, depth + 1)}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        )
      })}
    </ul>
  )

  if (isLoading) {
    return (
      <div className="app loading-screen">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.98, 1, 0.98] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="loading-text"
        >
          Loading repository...
        </motion.div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Vignette Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="vignette-overlay"
            initial={{ scale: 0, borderRadius: '50%' }}
            animate={{ scale: 50, borderRadius: '0%' }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className="sidebar"
        initial={{ x: -120, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 70, damping: 20 }}
      >
        <motion.div
          className="brand"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.2 }}
        >
          <motion.button
            className="logo-btn"
            onClick={handleLogoClick}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{
              scale: 1.2,
              rotate: [0, -15, 15, -15, 0],
              filter: "drop-shadow(0 0 25px rgba(254, 128, 25, 0.8))"
            }}
            whileTap={{ scale: 0.85 }}
          >
            <img src="/logo.png" alt="Duck Compiler" className="logo" />
          </motion.button>
          <motion.h1
            className="title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {"DUCK_COMPILER".split('').map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  delay: 0.5 + i * 0.05,
                  type: "spring",
                  stiffness: 150,
                  damping: 12
                }}
                style={{ display: 'inline-block', color: 'var(--fg0)', textShadow: 'none' }}
                whileHover={{
                  scale: 1.2,
                  color: '#fe8019',
                  textShadow: '0 0 20px rgba(254, 128, 25, 0.8)'
                }}
              >
                {char === '_' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.h1>
        </motion.div>

        {/* File Tree */}
        <motion.div
          className="file-tree"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        >
          <motion.div
            className="section-label"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            Files
          </motion.div>
          {renderFileTree(files)}
        </motion.div>

        {/* Language Display */}
        <motion.div
          className="controls"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          <motion.label
            className="label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Language
          </motion.label>
          <div className="dropdown" ref={dropdownRef}>
            <motion.button
              className="dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              whileHover={{ scale: 1.03, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.span
                key={language.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {language.label}
              </motion.span>
              <ChevronIcon />
            </motion.button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.ul
                  className="dropdown-menu"
                  initial={{ opacity: 0, y: -15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  {LANGUAGES.map((lang, index) => (
                    <motion.li
                      key={lang.value}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, type: "spring" }}
                    >
                      <motion.button
                        className={`dropdown-item ${language.value === lang.value ? 'active' : ''}`}
                        onClick={() => {
                          setLanguage(lang)
                          setDropdownOpen(false)
                        }}
                        whileHover={{ x: 6, backgroundColor: 'var(--bg2)', scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {lang.label}
                      </motion.button>
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          className="actions"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <motion.button
            onClick={handleRun}
            className="btn btn-run"
            disabled={isRunning || !code}
            whileHover={{ scale: 1.06, y: -4, boxShadow: "0 8px 25px rgba(152, 151, 26, 0.5)" }}
            whileTap={{ scale: 0.94 }}
            animate={isRunning ? {
              boxShadow: [
                "0 4px 15px rgba(152, 151, 26, 0.3)",
                "0 4px 35px rgba(152, 151, 26, 0.7)",
                "0 4px 15px rgba(152, 151, 26, 0.3)"
              ],
              scale: [1, 1.02, 1]
            } : {}}
            transition={isRunning ? { repeat: Infinity, duration: 1.2 } : { type: "spring", stiffness: 400 }}
          >
            <motion.span
              animate={isRunning ? { opacity: [1, 0.4, 1] } : {}}
              transition={isRunning ? { repeat: Infinity, duration: 0.8 } : {}}
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </motion.span>
          </motion.button>
          <motion.button
            onClick={handleClear}
            className="btn btn-clear"
            whileHover={{ scale: 1.06, backgroundColor: 'var(--bg2)' }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            Clear
          </motion.button>
        </motion.div>

        {/* Hidden Panels - Restore Buttons */}
        <AnimatePresence>
          {hiddenPanels.size > 0 && (
            <motion.div
              className="hidden-panels"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100 }}
            >
              <motion.div
                className="section-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Hidden Panels
              </motion.div>
              <div className="hidden-panels-list">
                {Array.from(hiddenPanels).map((panelId) => (
                  <motion.button
                    key={panelId}
                    className="hidden-panel-btn"
                    onClick={() => togglePanel(panelId)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.1, backgroundColor: 'var(--bg2)' }}
                    whileTap={{ scale: 0.95 }}
                    title={`Restore ${PANEL_LABELS[panelId]}`}
                  >
                    <span className="hidden-panel-icon">
                      {PANEL_ICONS[panelId]}
                    </span>
                    <span className="hidden-panel-label">{PANEL_LABELS[panelId]}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Main Content */}
      <div className="main-wrapper">
        <Group orientation="horizontal" className="panel-group" id="main-group">
          {/* Code Display (Read-only) */}
          {!isPanelHidden('code') && (
          <Panel
            id="code-panel"
            defaultSize={40}
            minSize={15}
            className="panel-container"
          >
            <motion.div
              className="panel code-panel"
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.15 }}
            >
              <div className="panel-header">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={activeFile}
                    className="panel-title"
                    initial={{ opacity: 0, y: -15, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.9 }}
                    transition={{ duration: 0.25, type: "spring" }}
                  >
                    {activeFile || 'Select a file'}
                  </motion.span>
                </AnimatePresence>
                <div className="panel-controls">
                  <motion.button
                    className="panel-btn"
                    onClick={autoFitCode}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Auto-fit code"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 14h6m0 0v6m0-6L3 21M20 10h-6m0 0V4m0 6l7-7M4 10h6m0 0V4m0 6L3 3M20 14h-6m0 0v6m0-6l7 7"/>
                    </svg>
                  </motion.button>
                  <motion.button
                    className="panel-btn"
                    onClick={() => setCodeFontSize(s => Math.min(s + 1, 20))}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Increase font"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </motion.button>
                  <motion.button
                    className="panel-btn"
                    onClick={() => setCodeFontSize(s => Math.max(s - 1, 8))}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Decrease font"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14"/>
                    </svg>
                  </motion.button>
                  <motion.button
                    className="panel-btn minimize-btn"
                    onClick={() => togglePanel('code')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Hide panel"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14"/>
                    </svg>
                  </motion.button>
                </div>
              </div>
              <motion.div
                ref={codeRef}
                className="code-display"
                style={{ fontSize: `${codeFontSize}px` }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
              >
                {code ? (
                  <Highlight
                    theme={themes.nightOwl}
                    code={code}
                    language={prismLanguage}
                  >
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <pre className={className} style={{ ...style, background: 'transparent', margin: 0, padding: 0, fontSize: 'inherit' }}>
                        {tokens.map((line, i) => (
                          <div key={i} {...getLineProps({ line })} className="code-line">
                            <span className="line-number">{i + 1}</span>
                            <span className="line-content">
                              {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                              ))}
                            </span>
                          </div>
                        ))}
                      </pre>
                    )}
                  </Highlight>
                ) : (
                  <span className="placeholder">Select a file to view code...</span>
                )}
              </motion.div>
            </motion.div>
          </Panel>
          )}

          {/* Separator after Code - shows if code is visible AND there's something after it */}
          {!isPanelHidden('code') && (!isPanelHidden('readme') || !isPanelHidden('input') || !isPanelHidden('output')) && <Separator className="resize-handle" />}

          {/* README Panel */}
          {!isPanelHidden('readme') && (
          <Panel
            id="readme-panel"
            defaultSize={30}
            minSize={10}
            className="panel-container"
          >
            <motion.div
              className="panel readme-panel"
              initial={{ y: 60, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.2 }}
            >
              <div className="panel-header">
                <motion.span
                  className="panel-title"
                  initial={{ x: -25, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  README.md
                </motion.span>
                <div className="panel-controls">
                  <motion.button
                    className="panel-btn minimize-btn"
                    onClick={() => togglePanel('readme')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Hide panel"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14"/>
                    </svg>
                  </motion.button>
                </div>
              </div>
              <motion.div
                className="readme-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55, type: "spring", stiffness: 100 }}
              >
                {readme ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
                ) : (
                  <span className="placeholder">No README found</span>
                )}
              </motion.div>
            </motion.div>
          </Panel>
          )}

          {!isPanelHidden('readme') && (!isPanelHidden('input') || !isPanelHidden('output')) && <Separator className="resize-handle" />}

          {/* IO Panel - only show if at least one IO panel is visible */}
          {(!isPanelHidden('input') || !isPanelHidden('output')) && (
          <Panel
            id="io-panel"
            defaultSize={30}
            minSize={10}
            className="panel-container"
          >
            <Group orientation="vertical" className="io-panel-group" id="io-group">
              {/* Input */}
              {!isPanelHidden('input') && (
              <Panel
                id="input-panel"
                defaultSize={50}
                minSize={15}
                className="panel-container"
              >
                <motion.div
                  className="panel io-panel"
                  initial={{ x: 60, opacity: 0, scale: 0.95 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.25 }}
                >
                  <div className="panel-header">
                    <motion.span
                      className="panel-title"
                      initial={{ x: -25, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      Input
                    </motion.span>
                    <div className="panel-controls">
                      <motion.span
                        className="panel-hint"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
                      >
                        stdin
                      </motion.span>
                      <motion.button
                        className="panel-btn minimize-btn"
                        onClick={() => togglePanel('input')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Hide panel"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14"/>
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                  <motion.textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="io-editor"
                    placeholder="Enter your input here..."
                    spellCheck={false}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55, type: "spring", stiffness: 100 }}
                    whileFocus={{
                      boxShadow: "inset 0 0 20px rgba(131, 165, 152, 0.1)",
                      borderColor: "var(--blue)"
                    }}
                  />
                </motion.div>
              </Panel>
              )}

              {!isPanelHidden('input') && !isPanelHidden('output') && <Separator className="resize-handle-vertical" />}

              {/* Output */}
              {!isPanelHidden('output') && (
              <Panel
                id="output-panel"
                defaultSize={50}
                minSize={15}
                className="panel-container"
              >
                <motion.div
                  className="panel io-panel"
                  initial={{ x: 60, opacity: 0, scale: 0.95 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.35 }}
                >
                  <div className="panel-header">
                    <motion.span
                      className="panel-title"
                      initial={{ x: -25, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6, type: "spring" }}
                    >
                      Output
                    </motion.span>
                    <div className="panel-controls">
                      <motion.span
                        className="panel-hint"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
                      >
                        stdout
                      </motion.span>
                      <motion.button
                        className="panel-btn minimize-btn"
                        onClick={() => togglePanel('output')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Hide panel"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14"/>
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                  <div className="output">
                    {output ? (
                      <pre>{output}</pre>
                    ) : (
                      <span className="placeholder">Output appears here...</span>
                    )}
                  </div>
                </motion.div>
              </Panel>
              )}
            </Group>
          </Panel>
          )}
        </Group>

        {/* Repository Info Bar */}
        <motion.footer
          className="repo-bar"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 80 }}
        >
          <motion.div
            className="repo-info"
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.svg
              className="repo-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              whileHover={{ rotate: 360, scale: 1.2 }}
              transition={{ duration: 0.6 }}
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
            </motion.svg>
            <span className="repo-owner">{GITHUB_OWNER}</span>
            <span className="repo-separator">/</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={repo}
                className="repo-name"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                whileHover={{ color: 'var(--aqua)' }}
              >
                {repo}
              </motion.span>
            </AnimatePresence>
            <motion.span
              className="repo-branch"
              whileHover={{ scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <svg className="branch-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9"/>
              </svg>
              main
            </motion.span>
          </motion.div>
          <motion.a
            href={`https://github.com/${GITHUB_OWNER}/${repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-repo-btn"
            whileHover={{ scale: 1.08, y: -3, boxShadow: "0 6px 20px rgba(0,0,0,0.3)" }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <svg className="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
            View Repository
          </motion.a>
        </motion.footer>
      </div>
    </div>
  )
}

export default App
