import React, { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

const mdStyles = `
.md-body { max-width: 860px; }
.md-body h1 {
  font-size: 2rem; font-weight: 700; color: var(--text-heading);
  padding-bottom: 12px; border-bottom: 1px solid var(--border);
  margin: 0 0 24px;
}
.md-body h2 {
  font-size: 1.35rem; font-weight: 600; color: var(--text-heading);
  padding-bottom: 8px; border-bottom: 1px solid var(--border);
  margin: 40px 0 16px;
}
.md-body h3 {
  font-size: 1.1rem; font-weight: 600; color: var(--text-heading);
  margin: 28px 0 12px;
}
.md-body h4 {
  font-size: .95rem; font-weight: 600; color: var(--text-heading);
  margin: 20px 0 10px;
}
.md-body p { margin: 0 0 16px; color: var(--text); }
.md-body ul, .md-body ol { margin: 0 0 16px 24px; }
.md-body li { margin: 4px 0; color: var(--text); }
.md-body li > p { margin: 0; }
.md-body strong { color: var(--text-heading); font-weight: 600; }
.md-body em { color: #ccc; }
.md-body blockquote {
  border-left: 3px solid var(--accent);
  padding: 10px 16px;
  margin: 16px 0;
  background: var(--accent-bg);
  border-radius: 0 6px 6px 0;
  color: var(--text-muted);
}
.md-body blockquote p { margin: 0; color: inherit; }
.md-body code:not(pre code) {
  font-family: var(--font-mono);
  font-size: .85em;
  background: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 4px;
  padding: 2px 6px;
  color: #f0883e;
}
.md-body pre {
  background: var(--code-bg) !important;
  border: 1px solid var(--code-border);
  border-radius: 8px;
  padding: 16px 20px;
  overflow-x: auto;
  margin: 16px 0;
  font-size: .875rem;
  line-height: 1.6;
}
.md-body pre code {
  background: none !important;
  border: none !important;
  padding: 0 !important;
  font-family: var(--font-mono);
  font-size: inherit;
  color: inherit;
}
.md-body table {
  width: 100%; border-collapse: collapse;
  margin: 16px 0; font-size: 14px;
  display: block; overflow-x: auto;
}
.md-body thead { background: var(--bg-sidebar); }
.md-body th {
  padding: 8px 12px; text-align: left;
  font-weight: 600; color: var(--text-heading);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.md-body td {
  padding: 7px 12px; border-bottom: 1px solid var(--border);
  color: var(--text); vertical-align: top;
}
.md-body tr:last-child td { border-bottom: none; }
.md-body tbody tr:hover { background: rgba(255,255,255,.02); }
.md-body hr {
  border: none; border-top: 1px solid var(--border);
  margin: 32px 0;
}
.md-body a { color: var(--accent); }
.md-body a:hover { color: var(--accent-hover); }
`

export default function DocContent({ content }) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [content])

  return (
    <main
      ref={ref}
      style={{
        marginLeft: 'var(--sidebar-width)',
        marginTop: 'var(--header-height)',
        minHeight: 'calc(100vh - var(--header-height))',
        padding: '40px 48px 80px',
        background: 'var(--bg-content)',
        overflowY: 'auto',
      }}
    >
      <style>{mdStyles}</style>
      <div className="md-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target={props.href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      <style>{`
        @media (max-width: 768px) {
          main { margin-left: 0 !important; padding: 24px 20px 60px !important; }
        }
      `}</style>
    </main>
  )
}
