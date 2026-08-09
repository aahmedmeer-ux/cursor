import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import './App.css'
import { ProfileForm } from './components/ProfileForm'
import { Results } from './components/Results'
import { calcMacros } from './lib/calculations'
import type { UserProfile } from './types'

const STORAGE_KEY = 'quwwat-profile-v1'

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

type View = 'home' | 'planner' | 'plan'

function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [view, setView] = useState<View>('home')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = loadProfile()
    if (saved) {
      setProfile(saved)
      setView('plan')
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    if (view === 'plan') {
      // Wait a tick so Results is mounted
      const id = window.setTimeout(() => {
        document.getElementById('plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return () => window.clearTimeout(id)
    }
    if (view === 'planner') {
      const id = window.setTimeout(() => {
        document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
      return () => window.clearTimeout(id)
    }
  }, [view, ready, profile])

  function handleSubmit(next: UserProfile) {
    setProfile(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setView('plan')
  }

  const macros = profile ? calcMacros(profile) : null
  const showPlan = view === 'plan' && profile && macros

  if (!ready) return null

  return (
    <div className="app">
      <nav className="nav">
        <a
          className="brand"
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            setView('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          Quwwat<span>.</span>
        </a>
        <div className="nav-actions">
          {showPlan ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setView('planner')}
              >
                Edit stats
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  document.getElementById('plan')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
              >
                My plan
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setView('planner')}
            >
              Get plan
            </button>
          )}
        </div>
      </nav>

      {!showPlan && (
        <header className="hero" id="top">
          <div className="hero-media" aria-hidden="true" />
          <div className="hero-content">
            <motion.p
              className="hero-brand"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Quwwat<em>.</em>
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.6 }}
            >
              Desi meals. Smart training. Your weight goal.
            </motion.h1>
            <motion.p
              className="hero-lead"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.55 }}
            >
              Enter height, weight, and target — get a Pakistan-friendly diet and
              the best exercises to get there.
            </motion.p>
            <motion.div
              className="hero-cta"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.5 }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setView('planner')}
              >
                Start my plan
              </button>
              <a className="btn btn-ghost" href="#how">
                How it works
              </a>
            </motion.div>
          </div>
        </header>
      )}

      {!showPlan && (
        <section className="section" id="how">
          <div className="section-head">
            <h2>Built for real Pakistani kitchens</h2>
            <p>
              Not bland chicken-and-broccoli lists. Quwwat plans around roti, daal,
              tikka, dahi, and bazaar groceries — plus gym or home workouts matched
              to fat loss, muscle gain, or maintenance.
            </p>
          </div>
        </section>
      )}

      {(view === 'planner' || view === 'home') && (
        <section className="section" id="planner">
          <div className="section-head">
            <h2>Your stats</h2>
            <p>
              Add height, current weight, and goal weight. We’ll calculate calories,
              macros, a 7-day desi meal plan, and a progressive exercise routine.
            </p>
          </div>

          <ProfileForm
            initial={profile ?? undefined}
            onSubmit={handleSubmit}
          />
        </section>
      )}

      {showPlan && (
        <section className="section plan-view" id="plan">
          <Results
            profile={profile}
            macros={macros}
            onEdit={() => setView('planner')}
          />
        </section>
      )}

      <footer className="footer">
        <p>
          <strong>Quwwat</strong> — strength with food you already know.{' '}
          Educational guidance only; consult a doctor before major diet or
          training changes.
        </p>
      </footer>
    </div>
  )
}

export default App
