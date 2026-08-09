import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Exercise } from '../types'

interface Props {
  exercise: Exercise
}

export function ExerciseDemo({ exercise }: Props) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="demo-thumb"
        onClick={() => setOpen(true)}
        aria-label={`Watch ${exercise.name} form demo`}
      >
        <img src={exercise.demoGif} alt="" loading="lazy" decoding="async" />
        <span className="demo-play">▶ Watch form</span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="demo-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="demo-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="demo-modal-head">
                <div>
                  <p className="meal-type">{exercise.muscle}</p>
                  <h3 id={titleId}>{exercise.name}</h3>
                </div>
                <button
                  type="button"
                  className="demo-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close demo"
                >
                  ✕
                </button>
              </div>
              <div className="demo-modal-media">
                <img
                  src={exercise.demoGif}
                  alt={`${exercise.name} demonstration`}
                />
              </div>
              <p className="demo-modal-tip">
                <strong>
                  {exercise.sets} × {exercise.reps}
                </strong>
                <span> · Rest {exercise.rest}</span>
                <br />
                {exercise.tip}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
