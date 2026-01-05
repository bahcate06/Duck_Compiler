import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import './Hub.css'

const GITHUB_OWNER = 'bahcate06'
const GITHUB_URL = 'https://github.com/bahcate06'

const ASCII_BANNER = `
██████╗ ██╗   ██╗ ██████╗██╗  ██╗     ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗██╗     ███████╗██████╗
██╔══██╗██║   ██║██╔════╝██║ ██╔╝    ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║██║     ██╔════╝██╔══██╗
██║  ██║██║   ██║██║     █████╔╝     ██║     ██║   ██║██╔████╔██║██████╔╝██║██║     █████╗  ██████╔╝
██║  ██║██║   ██║██║     ██╔═██╗     ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║██║     ██╔══╝  ██╔══██╗
██████╔╝╚██████╔╝╚██████╗██║  ██╗    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ██║███████╗███████╗██║  ██║
╚═════╝  ╚═════╝  ╚═════╝╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝
`

interface Repository {
  name: string
  description: string | null
  language: string | null
}

const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#3572A5',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  C: '#555555',
  'C++': '#f34b7d',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
}

function Hub() {
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_OWNER}/repos?sort=updated&per_page=20`)
        if (!response.ok) throw new Error('Failed to fetch repositories')
        const data = await response.json()
        // Repos to exclude (profile readme, this app, etc.)
        const excludedRepos = ['bahcate06', 'duck_compiler']
        // Languages that indicate web apps or complex projects
        const excludedLanguages = ['typescript', 'html', 'css', 'vue', 'svelte']

        setRepositories(
          data
            .filter((repo: { name: string; language: string | null }) => {
              const nameExcluded = excludedRepos.includes(repo.name.toLowerCase())
              const langExcluded = repo.language && excludedLanguages.includes(repo.language.toLowerCase())
              return !nameExcluded && !langExcluded
            })
            .map((repo: { name: string; description: string | null; language: string | null }) => ({
              name: repo.name,
              description: repo.description,
              language: repo.language,
            }))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repositories')
      } finally {
        setIsLoading(false)
      }
    }
    fetchRepositories()
  }, [])

  const handleLogoClick = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      window.location.href = GITHUB_URL
    }, 1200)
  }

  return (
    <div className="hub">
      {/* Vignette Transition Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            className="vignette-overlay"
            initial={{ scale: 0, borderRadius: '50%' }}
            animate={{
              scale: 50,
              borderRadius: '0%',
            }}
            transition={{
              duration: 1.2,
              ease: [0.22, 1, 0.36, 1]
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Particles Background */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0
            }}
            animate={{
              y: [null, Math.random() * -200 - 100],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut"
            }}
            style={{
              left: `${Math.random() * 100}%`,
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
            }}
          />
        ))}
      </div>

      {/* ASCII Banner */}
      <motion.pre
        className="ascii-banner"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          delay: 0.2,
          duration: 0.8,
          type: "spring",
          stiffness: 100
        }}
      >
        {ASCII_BANNER.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.001 }}
          >
            {char}
          </motion.span>
        ))}
      </motion.pre>

      {/* Subtitle */}
      <motion.p
        className="hub-subtitle"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring" }}
      >
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Select a repository to compile and run code
        </motion.span>
      </motion.p>

      {/* Repository Grid */}
      <motion.div
        className="repo-grid"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 80 }}
      >
        {isLoading ? (
          <motion.div
            className="loading-state"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Loading repositories...
          </motion.div>
        ) : error ? (
          <motion.div className="error-state">
            {error}
          </motion.div>
        ) : repositories.map((repo, index) => (
          <motion.button
            key={repo.name}
            className="repo-card"
            onClick={() => navigate(`/${repo.name}`)}
            initial={{ opacity: 0, y: 30, rotateX: -15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{
              delay: 0.8 + index * 0.1,
              type: "spring",
              stiffness: 100
            }}
            whileHover={{
              scale: 1.05,
              y: -8,
              rotateY: 5,
              boxShadow: "0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(254, 128, 25, 0.2)"
            }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="repo-card-glow"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            <div className="repo-card-content">
              <div className="repo-card-header">
                <motion.svg
                  className="repo-card-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
                </motion.svg>
                <span className="repo-card-name">{repo.name}</span>
              </div>
              <p className="repo-card-description">{repo.description || 'No description'}</p>
              <div className="repo-card-footer">
                {repo.language && (
                  <span className="repo-card-language" style={{ '--lang-color': LANGUAGE_COLORS[repo.language] || 'var(--fg4)' } as React.CSSProperties}>
                    <motion.span
                      className="language-dot"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {repo.language}
                  </span>
                )}
                <motion.span
                  className="repo-card-arrow"
                  initial={{ x: -10, opacity: 0 }}
                  whileHover={{ x: 0, opacity: 1 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </motion.span>
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Logo - Bottom Left */}
      <motion.div
        className="hub-logo"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 1,
          type: "spring",
          stiffness: 200,
          damping: 15
        }}
      >
        <motion.button
          className="logo-btn"
          onClick={handleLogoClick}
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{
            scale: 1.15,
            rotate: [0, -10, 10, -10, 0],
            filter: "drop-shadow(0 0 30px rgba(254, 128, 25, 0.8))"
          }}
          whileTap={{ scale: 0.9 }}
        >
          <img
            src="/logo.png"
            alt="Duck Compiler"
            className="hub-logo-img"
          />
        </motion.button>
        <motion.span
          className="logo-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Click me!
        </motion.span>
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="hub-footer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.6, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <motion.span
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Powered by JDoodle API
        </motion.span>
      </motion.footer>
    </div>
  )
}

export default Hub
