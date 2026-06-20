'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminUsers from './components/AdminUsers'
import AdminCourseEditor from './components/AdminCourseEditor'
import AdminCourses from './components/AdminCourses'

type Tab = 'courses' | 'users' | 'manage-courses'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('courses')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/login'); return }
    if (status === 'authenticated') {
      // Verify admin role server-side
      fetch('/api/admin/courses')
        .then(r => {
          if (r.status === 403 || r.status === 401) router.replace('/testing')
          else setChecking(false)
        })
        .catch(() => router.replace('/testing'))
    }
  }, [status, router])

  if (status === 'loading' || checking) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f0f0f', color:'#aaa' }}>
        Загрузка...
      </div>
    )
  }

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0f0f0f', color:'#e0e0e0', fontFamily:'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background:'#161616', borderRight:'1px solid #2a2a2a', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'20px 16px 12px', borderBottom:'1px solid #2a2a2a' }}>
          <div style={{ fontSize:11, color:'#666', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>техноград</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>Админ-панель</div>
        </div>

        <nav style={{ padding:'8px 8px', flex:1 }}>
          {([
            { id: 'manage-courses', label: 'Курсы', icon: '🎓' },
            { id: 'courses', label: 'Контент курсов', icon: '📚' },
            { id: 'users',   label: 'Пользователи',  icon: '👥' },
          ] as {id:Tab, label:string, icon:string}[]).map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              width: '100%', textAlign:'left', padding:'10px 12px', borderRadius:8,
              background: tab === item.id ? '#1e3a1e' : 'transparent',
              color: tab === item.id ? '#62a54b' : '#bbb',
              border: 'none', cursor:'pointer', fontSize:14,
              display:'flex', alignItems:'center', gap:10,
              marginBottom: 2,
            }}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding:'12px 16px', borderTop:'1px solid #2a2a2a', fontSize:12, color:'#555' }}>
          {session?.user?.email}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:'auto' }}>
        {tab === 'manage-courses' && <AdminCourses />}
        {tab === 'courses' && <AdminCourseEditor />}
        {tab === 'users'   && <AdminUsers />}
      </main>
    </div>
  )
}
