import React from 'react'

export default function Header({ onMenuToggle }) {
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--header-height)',
      background: 'rgba(13,17,23,.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      zIndex: 200,
    }}>
      <button
        onClick={onMenuToggle}
        className="menu-btn"
        aria-label="Toggle menu"
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: 'var(--text)',
          cursor: 'pointer',
          padding: 4,
          fontSize: 20,
        }}
      >
        ☰
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 22 }}>📜</span>
        <span style={{
          fontWeight: 700,
          fontSize: 17,
          color: 'var(--text-heading)',
          letterSpacing: '-0.02em',
        }}>
          fsr
        </span>
        <span style={{
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          border: '1px solid rgba(56,139,253,.3)',
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          padding: '1px 7px',
          fontFamily: 'var(--font-mono)',
        }}>
          v7.2.6
        </span>
      </div>

      <div style={{ flex: 1 }} />

      <a
        href="https://www.npmjs.com/package/fsr"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: 'var(--text-muted)',
          fontSize: 13,
          padding: '5px 10px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          transition: 'color .15s, border-color .15s',
          textDecoration: 'none',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--text)'
          e.currentTarget.style.borderColor = '#555'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        npm install -g fsr
      </a>

      <style>{`
        @media (max-width: 768px) {
          .menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  )
}
