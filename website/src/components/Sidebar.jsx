import React from 'react'
import { nav } from '../docs/index.js'

export default function Sidebar({ active, onSelect, mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 99 }}
          onClick={onClose}
        />
      )}
      <aside style={{
        position: 'fixed',
        top: 'var(--header-height)',
        left: 0,
        width: 'var(--sidebar-width)',
        height: 'calc(100vh - var(--header-height))',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
        padding: '16px 0',
        zIndex: 100,
        transform: mobileOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.2s ease',
      }}>
        {nav.map(section => (
          <div key={section.group} style={{ marginBottom: 8 }}>
            <div style={{
              padding: '6px 20px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              {section.group}
            </div>
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelect(item.id); onClose?.(); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 20px 7px 24px',
                  background: active === item.id ? 'var(--accent-bg)' : 'transparent',
                  color: active === item.id ? 'var(--accent)' : 'var(--text-muted)',
                  border: 'none',
                  borderLeft: active === item.id
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  transition: 'background .15s, color .15s',
                }}
                onMouseEnter={e => {
                  if (active !== item.id) e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={e => {
                  if (active !== item.id) e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>
    </>
  )
}
