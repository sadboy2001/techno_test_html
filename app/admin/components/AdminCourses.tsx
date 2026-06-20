'use client'

import { useEffect, useState, useCallback } from 'react'
import ConfirmModal from './ConfirmModal'

type Course = {
  id: string; title: string; description?: string | null; icon?: string | null; order: number; parentId?: string | null
  chapters: { id: string; title: string; order: number; lessons: { id: string; title: string; steps: any[] }[] }[]
}

const S = {
  btn: (variant: 'primary' | 'ghost' | 'danger' = 'ghost') => ({
    padding: variant === 'primary' ? '8px 18px' : '6px 12px',
    borderRadius: 7,
    border: variant === 'danger' ? '1px solid #4a1a1a' : '1px solid #2a2a2a',
    background: variant === 'primary' ? '#62a54b' : variant === 'danger' ? '#2a0f0f' : '#1e1e1e',
    color: variant === 'primary' ? '#fff' : variant === 'danger' ? '#f87171' : '#aaa',
    cursor: 'pointer', fontSize: 13, fontWeight: variant === 'primary' ? 600 : 400,
  }),
  input: { padding: '8px 12px', borderRadius: 7, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#e0e0e0', fontSize: 13, width: '100%', boxSizing: 'border-box' as const },
  label: { fontSize: 11, color: '#666', marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
}

function CreateCourseModal({ onAdd, onClose }: { onAdd: () => void; onClose: () => void }) {
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('📘')
  const [levels, setLevels] = useState(1)
  const [levelNames, setLevelNames] = useState<string[]>(['Базовый курс', 'Продвинутый курс', 'Финальный курс'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setLevelName = (i: number, val: string) => {
    const names = [...levelNames]
    names[i] = val
    setLevelNames(names)
  }

  const save = async () => {
    if (!id.trim() || !title.trim()) return
    setSaving(true)
    setError('')

    const levelNamesToUse = levels > 1
      ? levelNames.slice(0, levels).map((n, i) => n.trim() || `Уровень ${i + 1}`)
      : []

    const r = await fetch('/api/admin/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id.trim(),
        title: title.trim(),
        description: description.trim() || null,
        icon,
        levels: levels > 1 ? levels : undefined,
        levelNames: levelNamesToUse.length > 0 ? levelNamesToUse : undefined,
      }),
    })
    const data = await r.json()
    if (!r.ok) {
      setError(data.error || 'Ошибка')
      setSaving(false)
      return
    }
    setSaving(false)
    onAdd()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, width: 520, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Новый курс</h2>
        {error && <div style={{ background: '#2a0f0f', border: '1px solid #4a1a1a', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={S.label}>ID курса (латиница)</label>
            <input style={S.input} value={id} onChange={e => setId(e.target.value)}
              placeholder="html_basics" autoFocus />
          </div>
          <div>
            <label style={S.label}>Название курса</label>
            <input style={S.input} value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Основы HTML" />
          </div>
          <div>
            <label style={S.label}>Описание (опционально)</label>
            <input style={S.input} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Изучаем основы вёрстки с нуля" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Иконка (эмодзи)</label>
              <input style={{ ...S.input, width: 80, textAlign: 'center', fontSize: 24 }} value={icon} onChange={e => setIcon(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Количество уровней</label>
              <select
                style={S.input}
                value={levels}
                onChange={e => setLevels(parseInt(e.target.value))}
              >
                <option value={1}>1 — без уровней</option>
                <option value={2}>2 уровня</option>
                <option value={3}>3 уровня</option>
              </select>
            </div>
          </div>

          {levels > 1 && (
            <div>
              <label style={S.label}>Названия уровней</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: levels }, (_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: 'center' }}>
                      {i === 0 ? '📘' : i === 1 ? '🚀' : '🎓'}
                    </span>
                    <input
                      style={{ ...S.input, flex: 1 }}
                      value={levelNames[i] || ''}
                      onChange={e => setLevelName(i, e.target.value)}
                      placeholder={`Уровень ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={S.btn()}>Отмена</button>
          <button onClick={save} disabled={saving || !id.trim() || !title.trim()} style={S.btn('primary')}>
            {saving ? 'Создание...' : 'Создать курс'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null)
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null)
  const [levelTitle, setLevelTitle] = useState('')
  const [levelDesc, setLevelDesc] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/courses').then(r => r.json()).then(data => {
      setCourses(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  const parentCourses = courses.filter(c => !c.parentId)
  const childCourses = courses.filter(c => c.parentId)

  const courseStats = (parentId: string) => {
    const children = childCourses.filter(c => c.parentId === parentId)
    const allCourses = children.length > 0 ? children : courses.filter(c => c.id === parentId)
    const totalLessons = allCourses.reduce((s, c) => s + c.chapters.reduce((ch, l) => ch + l.lessons.length, 0), 0)
    const totalSteps = allCourses.reduce((s, c) => s + c.chapters.reduce((ch, l) => ch + l.lessons.reduce((le, st) => le + st.steps.length, 0), 0), 0)
    return { levels: allCourses.length, lessons: totalLessons, steps: totalSteps }
  }

  if (loading) return <div style={{ padding: 40, color: '#666' }}>Загрузка...</div>

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Управление курсами</h2>
          <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>Создавайте курсы с уровнями для выбора при регистрации</p>
        </div>
        <button onClick={() => setCreating(true)} style={S.btn('primary')}>
          + Новый курс
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {parentCourses.map(course => {
          const stats = courseStats(course.id)
          const levels = childCourses.filter(c => c.parentId === course.id)
          const hasLevels = levels.length > 0

          return (
            <div key={course.id} style={{
              background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{course.icon || '📘'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 600 }}>{course.title}</div>
                  <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                    ID: <code style={{ color: '#62a54b' }}>{course.id}</code>
                    {course.description && <> · {course.description}</>}
                  </div>
                  <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>
                    {stats.levels} {stats.levels === 1 ? 'уровень' : 'уровней'} · {stats.lessons} уроков · {stats.steps} шагов
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setConfirmDelete({ id: course.id, title: course.title })} style={S.btn('danger')}>🗑</button>
                </div>
              </div>

              {hasLevels && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {levels.map(level => (
                    editingLevelId === level.id ? (
                      <div key={level.id} style={{
                        background: '#0f0f0f', border: '1px solid #62a54b', borderRadius: 8, padding: '10px 14px',
                        display: 'flex', flexDirection: 'column', gap: 6,
                      }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{level.icon || '📄'}</span>
                          <input style={{ ...S.input, flex: 1, fontSize: 13 }} value={levelTitle}
                            onChange={e => setLevelTitle(e.target.value)} placeholder="Название" autoFocus
                            onKeyDown={e => { if (e.key === 'Escape') setEditingLevelId(null) }} />
                        </div>
                        <input style={{ ...S.input, fontSize: 12, color: '#888' }} value={levelDesc}
                          onChange={e => setLevelDesc(e.target.value)} placeholder="Описание уровня (опционально)"
                          onKeyDown={e => { if (e.key === 'Escape') setEditingLevelId(null) }} />
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={async () => {
                            await fetch(`/api/admin/courses/${level.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ title: levelTitle.trim() || level.title, description: levelDesc.trim() || null }),
                            })
                            setEditingLevelId(null)
                            load()
                          }} style={{ ...S.btn('primary'), padding: '4px 12px', fontSize: 11 }}>Сохранить</button>
                          <button onClick={() => setEditingLevelId(null)} style={{ ...S.btn(), padding: '4px 12px', fontSize: 11 }}>Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div key={level.id} style={{
                        background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 14px',
                        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                        onClick={() => {
                          setEditingLevelId(level.id)
                          setLevelTitle(level.title)
                          setLevelDesc(level.description || '')
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1e1e1e'}
                        title="Нажмите чтобы редактировать название и описание"
                      >
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{level.icon || '📄'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#bbb', fontSize: 13 }}>{level.title}</div>
                          {level.description && (
                            <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{level.description}</div>
                          )}
                          <div style={{ color: '#444', fontSize: 11, marginTop: 2 }}>
                            {level.chapters.length} глав · {level.chapters.reduce((s, ch) => s + ch.lessons.length, 0)} уроков
                          </div>
                        </div>
                        <code style={{ color: '#62a54b', fontSize: 11 }}>{level.id}</code>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {parentCourses.length === 0 && (
          <div style={{ color: '#555', textAlign: 'center', padding: 40, fontSize: 14 }}>
            Нет курсов. Создайте первый курс.
          </div>
        )}
      </div>

      {creating && <CreateCourseModal onAdd={load} onClose={() => setCreating(false)} />}

      {confirmDelete && (
        <ConfirmModal
          title="Удалить курс?"
          message={`Вы уверены, что хотите удалить курс "${confirmDelete.title}"? Все уровни и контент будут удалены. Пользователи будут отвязаны от курса.`}
          confirmLabel="Удалить"
          danger
          onConfirm={async () => {
            await fetch(`/api/admin/courses/${confirmDelete.id}`, { method: 'DELETE' })
            setConfirmDelete(null)
            load()
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
