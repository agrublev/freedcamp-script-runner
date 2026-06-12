import React, { useState } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import DocContent from './components/DocContent.jsx'
import { docs } from './docs/index.js'

export default function App() {
  const [active, setActive] = useState('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <Header onMenuToggle={() => setMobileOpen(o => !o)} />
      <Sidebar
        active={active}
        onSelect={setActive}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <DocContent content={docs[active] ?? '# Not found'} />
    </>
  )
}
