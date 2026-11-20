'use client'

import { useEffect } from 'react'
import './print-intro.css'

type Props = { className?: string; onDone?: () => void }

const LINES = [['PIXLDROP'], ['3D', 'DRUCK', 'SHOP']]
const TOTAL_MS = 4300

export default function PrintIntro({ className = '', onDone }: Props) {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => onDone?.(), reduce ? 0 : TOTAL_MS)
    return () => window.clearTimeout(t)
  }, [onDone])

  let n = 0
  return (
    <div className={`pi ${className}`.trim()}>
      <div className="pi-logo" aria-hidden="true">
        <img src="/shop/logo-pixldrop-3d.webp" width={800} height={800} alt="" className="pi-logo-img" />
        <div className="pi-head">
          <div className="pi-sweep">
            <svg viewBox="0 0 120 40" width="120" height="40">
              <rect x="30" y="0" width="60" height="22" rx="3" fill="#161513" />
              <rect x="36" y="6" width="48" height="4" fill="#8d877c" />
              <path d="M50 22h20l-7 12h-6z" fill="#161513" />
              <rect x="58.5" y="34" width="3" height="5" fill="#8d877c" />
            </svg>
            <span className="pi-line" />
          </div>
        </div>
      </div>
      <h1 className="pi-title" aria-label="Pixldrop 3D Druck Shop">
        {LINES.map((words, li) => (
          <span className={`pi-row pi-row-${li}`} key={li} aria-hidden="true">
            {words.map((w, wi) => (
              <span className="pi-word" key={wi}>
                {w.split('').map((ch, ci) => {
                  const i = n++
                  return (
                    <span
                      key={ci}
                      className={`pi-ch ${i % 2 ? 'from-r' : 'from-l'}`}
                      style={{ ['--i' as string]: i }}
                    >
                      {ch}
                    </span>
                  )
                })}
              </span>
            ))}
          </span>
        ))}
      </h1>
    </div>
  )
}
