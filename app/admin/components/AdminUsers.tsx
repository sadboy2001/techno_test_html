'use client'

import { useEffect, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import MiniCalendar from './MiniCalendar'

type Progress = { course: string; completedSteps: string; updatedAt: string }
type User = { id: string; name: string | null; email: string; role: string; createdAt: string; progress: Progress[] }
type CourseInfo = { id: string; title: string; levels?: { id: string; title: string }[] | null }

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [confirmRole, setConfirmRole] = useState<{ user: User; newRole: string } | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/courses').then(r => r.json()),
    ]).then(([usersData, coursesData]) => {
      setUsers(Array.isArray(usersData) ? usersData : [])
      setCourses(Array.isArray(coursesData) ? coursesData : [])
      setLoading(false)
    })
  }

  useEffect(load, [])

  const selectedCourse = courses.find(c => c.id === filterCourse)
  const levels = selectedCourse?.levels || []

  const toggleAdmin = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    setConfirmRole({ user, newRole })
  }

  const confirmRoleChange = async () => {
    if (!confirmRole) return
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: confirmRole.user.id, role: confirmRole.newRole })
    })
    setConfirmRole(null)
    load()
  }

  const exportExcel = () => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (filterLevel) params.set('course', filterLevel)
    else if (filterCourse) params.set('course', filterCourse)
    window.open(`/api/admin/export?${params.toString()}`, '_blank')
  }

  const stepsCount = (p: Progress[]) => {
    return p.reduce((acc, pr) => {
      try { return acc + JSON.parse(pr.completedSteps).length } catch { return acc }
    }, 0)
  }

  if (loading) return <div style={{ padding:40, color:'#666' }}>Загрузка...</div>

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, marginBottom:6, color:'#fff' }}>Пользователи</h1>
          <p style={{ color:'#666', fontSize:14 }}>Всего: {users.length}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#666' }}>Курс:</label>
            <select value={filterCourse} onChange={e => { setFilterCourse(e.target.value); setFilterLevel('') }}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#e0e0e0', fontSize: 12 }}>
              <option value="">Все курсы</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {levels.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: '#666' }}>Уровень:</label>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#e0e0e0', fontSize: 12 }}>
                <option value="">Все уровни</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#666' }}>С:</label>
            <MiniCalendar value={dateFrom} onChange={setDateFrom} placeholder="Начало" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#666' }}>По:</label>
            <MiniCalendar value={dateTo} onChange={setDateTo} placeholder="Конец" />
          </div>
          <button onClick={exportExcel} style={{
            padding: '6px 14px', borderRadius: 7, border: '1px solid #2a2a2a',
            background: '#1e3a1e', color: '#62a54b', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            📊 Скачать Excel
          </button>
        </div>
      </div>

      <div style={{ background:'#161616', borderRadius:12, border:'1px solid #2a2a2a', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
          <thead>
            <tr style={{ background:'#1a1a1a', borderBottom:'1px solid #2a2a2a' }}>
              {['Имя / Email', 'Роль', 'Шагов пройдено', 'Регистрация', ''].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:'#666', fontWeight:500, fontSize:12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} style={{ borderBottom: i < users.length-1 ? '1px solid #1e1e1e' : 'none' }}>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ fontWeight:500, color:'#fff' }}>{user.name || '—'}</div>
                  <div style={{ color:'#666', fontSize:12 }}>{user.email}</div>
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                    background: user.role === 'admin' ? '#1e3a1e' : '#1e1e1e',
                    color: user.role === 'admin' ? '#62a54b' : '#888',
                  }}>
                    {user.role === 'admin' ? '★ admin' : 'user'}
                  </span>
                </td>
                <td style={{ padding:'12px 16px', color:'#aaa' }}>
                  {stepsCount(user.progress)}
                </td>
                <td style={{ padding:'12px 16px', color:'#555', fontSize:12 }}>
                  {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <button onClick={() => toggleAdmin(user)} style={{
                    padding:'5px 12px', borderRadius:6, border:'1px solid #333',
                    background:'transparent', color:'#888', cursor:'pointer', fontSize:12
                  }}>
                    {user.role === 'admin' ? 'Снять admin' : 'Сделать admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmRole && (
        <ConfirmModal
          title="Изменить роль?"
          message={`Изменить роль ${confirmRole.user.email} на "${confirmRole.newRole}"?`}
          confirmLabel="Изменить"
          onConfirm={confirmRoleChange}
          onClose={() => setConfirmRole(null)}
        />
      )}
    </div>
  )
}
