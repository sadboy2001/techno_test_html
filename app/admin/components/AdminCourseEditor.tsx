'use client'

import { useEffect, useState, useCallback } from 'react'
import ConfirmModal from './ConfirmModal'

type Step = {
  id: string; order: number; type: string; title: string
  content?: string; question?: string; instruction?: string
  options?: string; correctAnswers?: string; multiple: boolean
  explanation?: string; points: number; statsSolved: number; statsAccuracy: number
}
type Lesson = { id: string; title: string; order: number; steps: Step[] }
type Chapter = { id: string; title: string; order: number; lessons: Lesson[] }
type Course = { id: string; title: string; order: number; parentId?: string | null; icon?: string | null; description?: string | null; chapters: Chapter[] }

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
  textarea: (rows = 4) => ({ padding: '8px 12px', borderRadius: 7, border: '1px solid #2a2a2a', background: '#0f0f0f', color: '#e0e0e0', fontSize: 12, width: '100%', boxSizing: 'border-box' as const, fontFamily: 'monospace', resize: 'vertical' as const, minHeight: rows * 22 }),
  label: { fontSize: 11, color: '#666', marginBottom: 4, display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
}

// ── Step Preview ─────────────────────────────────────────────────────
function StepPreview({ step, onClose }: { step: Step; onClose: () => void }) {
  const options = step.options ? JSON.parse(step.options) : []
  const correct: number[] = step.correctAnswers ? JSON.parse(step.correctAnswers) : []

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: 680, maxHeight: '88vh', overflow: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {step.type === 'theory' ? '📖 Предпросмотр — Теория' : '❓ Предпросмотр — Квиз'}
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #ddd', borderRadius: 8, fontSize: 18, padding: '4px 10px', cursor: 'pointer', color: '#666' }}>✕</button>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 20 }}>{step.title}</h2>

        {step.type === 'theory' && (
          <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: step.content || '<p style="color:#555">Контент не заполнен</p>' }} />
        )}

        {step.type === 'quiz' && (
          <>
            <p style={{ color: '#ddd', fontSize: 15, marginBottom: 8 }}>{step.question}</p>
            <p style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>{step.instruction || 'Выберите один вариант из списка'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt: string, i: number) => (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 8,
                  border: correct.includes(i) ? '1px solid #62a54b' : '1px solid #2a2a2a',
                  background: correct.includes(i) ? '#0d1f0d' : '#161616',
                  color: correct.includes(i) ? '#62a54b' : '#bbb',
                  fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', border: `1px solid ${correct.includes(i) ? '#62a54b' : '#444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, color: correct.includes(i) ? '#62a54b' : '#555' }}>
                    {correct.includes(i) ? '✓' : ''}
                  </span>
                  {opt || <span style={{ color: '#444' }}>Пустой вариант</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Step Editor ──────────────────────────────────────────────────────
function StepEditor({ step, onSave, onDelete, onClose }: {
  step: Step; onSave: (s: Step) => void; onDelete: () => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    ...step,
    options: step.options ? JSON.parse(step.options) : ['', '', '', ''],
    correctAnswers: step.correctAnswers ? JSON.parse(step.correctAnswers) : [],
  })
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    setSaving(true)
    const payload = {
      ...form,
      options: form.type === 'quiz' ? form.options : undefined,
      correctAnswers: form.type === 'quiz' ? form.correctAnswers : undefined,
    }
    const r = await fetch(`/api/admin/steps/${step.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const updated = await r.json()
    setSaving(false)
    onSave(updated)
  }

  const toggleCorrect = (i: number) => {
    const cur: number[] = form.correctAnswers
    if (form.multiple) {
      set('correctAnswers', cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i])
    } else {
      set('correctAnswers', [i])
    }
  }

  const previewStep: Step = {
    ...step,
    title: form.title,
    content: form.content,
    question: form.question,
    instruction: form.instruction,
    explanation: form.explanation,
    options: form.type === 'quiz' ? JSON.stringify(form.options) : undefined,
    correctAnswers: form.type === 'quiz' ? JSON.stringify(form.correctAnswers) : undefined,
    multiple: form.multiple,
    points: form.points,
  }

  return (
    <>
      {previewing && <StepPreview step={previewStep} onClose={() => setPreviewing(false)} />}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>
              {step.type === 'theory' ? '📖 Теория' : '❓ Квиз'} — редактор шага
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPreviewing(true)} style={{ ...S.btn('ghost'), fontSize: 13 }}>👁 Предпросмотр</button>
              <button onClick={onClose} style={{ ...S.btn('ghost'), fontSize: 18, padding: '4px 10px' }}>✕</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={S.label}>Заголовок шага</label>
              <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} />
            </div>

            {form.type === 'theory' && (
              <div>
                <label style={S.label}>Контент (HTML)</label>
                <textarea style={S.textarea(12)} value={form.content || ''} onChange={e => set('content', e.target.value)} />
              </div>
            )}

            {form.type === 'quiz' && (
              <>
                <div>
                  <label style={S.label}>Вопрос</label>
                  <textarea style={S.textarea(3)} value={form.question || ''} onChange={e => set('question', e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={S.label}>Инструкция</label>
                    <input style={S.input} value={form.instruction || ''} onChange={e => set('instruction', e.target.value)}
                      placeholder="Выберите один вариант из списка" />
                  </div>
                  <div style={{ width: 100 }}>
                    <label style={S.label}>Баллы</label>
                    <input style={S.input} type="number" min={1} max={5} value={form.points}
                      onChange={e => set('points', parseInt(e.target.value))} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ ...S.label, marginBottom: 0 }}>Варианты ответов (нажми ✓ чтобы отметить правильный)</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.multiple} onChange={e => set('multiple', e.target.checked)} />
                      Несколько правильных
                    </label>
                  </div>
                  {(form.options as string[]).map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <button onClick={() => toggleCorrect(i)} title="Отметить правильным" style={{
                        width: 28, height: 28, borderRadius: 6, border: '1px solid #333', flexShrink: 0,
                        background: form.correctAnswers.includes(i) ? '#1e3a1e' : '#1e1e1e',
                        color: form.correctAnswers.includes(i) ? '#62a54b' : '#555',
                        cursor: 'pointer', fontSize: 14,
                      }}>✓</button>
                      <input style={S.input} value={opt}
                        onChange={e => { const o = [...form.options]; o[i] = e.target.value; set('options', o) }}
                        placeholder={`Вариант ${i + 1}`} />
                      <button onClick={() => {
                        const o = (form.options as string[]).filter((_, j) => j !== i)
                        set('options', o)
                        set('correctAnswers', form.correctAnswers.filter((x: number) => x !== i).map((x: number) => x > i ? x - 1 : x))
                      }} style={{ ...S.btn('danger'), padding: '6px 8px', flexShrink: 0 }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => set('options', [...form.options, ''])} style={{ ...S.btn(), marginTop: 4, fontSize: 12 }}>
                    + Добавить вариант
                  </button>
                </div>

                <div>
                  <label style={S.label}>Подсказка (показывается после неверного ответа)</label>
                  <textarea style={S.textarea(4)} value={form.explanation || ''}
                    onChange={e => set('explanation', e.target.value)}
                    placeholder="Объяснение правильного ответа..." />
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid #2a2a2a' }}>
            <button onClick={onDelete} style={S.btn('danger')}>
              🗑 Удалить шаг
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={S.btn()}>Отмена</button>
              <button onClick={save} disabled={saving} style={S.btn('primary')}>
                {saving ? 'Сохранение...' : '✓ Сохранить'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Add Step Modal ───────────────────────────────────────────────────
function AddStepModal({ lessonId, onAdd, onClose }: { lessonId: string; onAdd: () => void; onClose: () => void }) {
  const [type, setType] = useState<'theory' | 'quiz'>('theory')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await fetch('/api/admin/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId, type, title,
        instruction: type === 'quiz' ? 'Выберите один вариант из списка' : undefined,
        options: type === 'quiz' ? ['', '', '', ''] : undefined,
        correctAnswers: type === 'quiz' ? [] : undefined,
        content: type === 'theory' ? '<p>Введите контент...</p>' : undefined,
      }),
    })
    setSaving(false)
    onAdd()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, width: 440, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Добавить шаг</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Тип шага</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['theory', 'quiz'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{ ...S.btn(type === t ? 'primary' : 'ghost'), flex: 1, textAlign: 'center' }}>
                {t === 'theory' ? '📖 Теория' : '❓ Квиз'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Заголовок</label>
          <input style={S.input} value={title} onChange={e => setTitle(e.target.value)}
            placeholder={type === 'theory' ? 'Название темы' : 'Вопрос №...'} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={S.btn()}>Отмена</button>
          <button onClick={save} disabled={saving || !title.trim()} style={S.btn('primary')}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Lesson Modal ─────────────────────────────────────────────────
function AddLessonModal({ chapterId, onAdd, onClose }: { chapterId: string; onAdd: () => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId, title, id: `lesson_${Date.now()}` }),
    })
    setSaving(false)
    onAdd()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 14, width: 440, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Добавить урок</h2>
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Название урока</label>
          <input style={S.input} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="1.5 Название темы" autoFocus
            onKeyDown={e => e.key === 'Enter' && save()} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={S.btn()}>Отмена</button>
          <button onClick={save} disabled={saving || !title.trim()} style={S.btn('primary')}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────
export default function AdminCourseEditor() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [editStep, setEditStep] = useState<Step | null>(null)
  const [previewStep, setPreviewStep] = useState<Step | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [addingLesson, setAddingLesson] = useState<string | null>(null)
  const [audioMap, setAudioMap] = useState<Record<string, string>>({})
  const [audioDragOver, setAudioDragOver] = useState<string | false>(false)
  const [audioUploading, setAudioUploading] = useState<string | false>(false)
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [editingLevel, setEditingLevel] = useState<string | null>(null)
  const [levelEditTitle, setLevelEditTitle] = useState('')
  const [levelEditDesc, setLevelEditDesc] = useState('')

  const loadAudioMap = useCallback(() => {
    fetch('/api/admin/audio').then(r => r.json()).then(data => {
      if (data && typeof data === 'object') setAudioMap(data)
    })
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/courses').then(r => r.json()).then(data => {
      setCourses(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { load(); loadAudioMap() }, [load, loadAudioMap])

  // Filter: parent courses and their children
  const parentCourses = courses.filter(c => !c.parentId)
  const childCourses = courses.filter(c => c.parentId)

  // When a parent is selected, show its levels as tabs
  const activeParent = parentCourses.find(c => c.id === selectedCourseId)
  const isParentSelected = !!activeParent
  const activeLevels = isParentSelected ? childCourses.filter(c => c.parentId === selectedCourseId) : []
  const singleCourse = !isParentSelected ? courses.find(c => c.id === selectedCourseId) : null

  // For parent courses: which level tab is active
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null)
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editingChapterTitle, setEditingChapterTitle] = useState('')
  const [addingChapter, setAddingChapter] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const activeLevel = activeLevels.find(c => c.id === activeLevelId)

  // The actual course being edited
  const editedCourse = isParentSelected ? activeLevel : singleCourse

  useEffect(() => {
    if (isParentSelected && activeLevels.length > 0 && !activeLevelId) {
      setActiveLevelId(activeLevels[0].id)
    }
  }, [selectedCourseId, activeLevels])

  // Reset lesson when course changes
  useEffect(() => {
    setActiveLesson(null)
  }, [selectedCourseId, activeLevelId])

  useEffect(() => {
    if (!activeLesson || !editedCourse) return
    for (const ch of editedCourse.chapters) {
      const l = ch.lessons.find(l => l.id === activeLesson.id)
      if (l) { setActiveLesson(l); return }
    }
  }, [courses, activeLevelId, selectedCourseId])

  const uploadAudio = async (file: File, lessonId: string, stepIndex: number) => {
    const stepKey = `${lessonId}_${stepIndex}`
    setAudioUploading(stepKey)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('lessonId', lessonId)
    fd.append('stepIndex', String(stepIndex))
    await fetch('/api/admin/audio', { method: 'POST', body: fd })
    loadAudioMap()
    setAudioUploading(false)
    setAudioDragOver(false)
  }

  const removeAudio = async (lessonId: string, stepIndex: number) => {
    await fetch('/api/admin/audio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, stepIndex }),
    })
    loadAudioMap()
  }

  const deleteStep = async (stepId: string) => {
    await fetch(`/api/admin/steps/${stepId}`, { method: 'DELETE' })
    setEditStep(null)
    load()
  }

  const deleteLesson = async (lessonId: string) => {
    setConfirmModal({
      title: 'Удалить урок?',
      message: 'Удалить урок и все его шаги? Это действие необратимо.',
      onConfirm: async () => {
        await fetch(`/api/admin/lessons/${lessonId}`, { method: 'DELETE' })
        if (activeLesson?.id === lessonId) setActiveLesson(null)
        setConfirmModal(null)
        load()
      },
    })
  }

  const reorderStep = async (stepId: string, direction: 'up' | 'down') => {
    await fetch('/api/admin/steps/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId, direction }),
    })
    load()
  }

  const stepIcon = (type: string) => type === 'quiz' ? '❓' : type === 'practice' ? '🔧' : '📖'

  const goBack = () => {
    setSelectedCourseId(null)
    setActiveLesson(null)
    setActiveLevelId(null)
  }

  if (loading) return <div style={{ padding: 40, color: '#666' }}>Загрузка курсов...</div>

  // ── Step 1: Course selection ───────────────────────────────────────
  if (!selectedCourseId) {
    if (courses.length === 0) {
      return (
        <div style={{ padding: 40 }}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 12, padding: 32, maxWidth: 520 }}>
            <h2 style={{ color: '#fff', marginBottom: 12 }}>База данных пуста</h2>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Контент курса ещё не импортирован из main.js в базу данных.<br />
              Выполни команду локально:
            </p>
            <pre style={{ background: '#0f0f0f', padding: '12px 16px', borderRadius: 8, fontSize: 13, color: '#62a54b', overflow: 'auto' }}>
              {`npm install\nnode prisma/seed.mjs`}
            </pre>
            <p style={{ color: '#555', fontSize: 12, marginTop: 12 }}>После этого обнови страницу.</p>
          </div>
        </div>
      )
    }

    return (
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Выберите курс</h2>
          <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>Выберите курс для редактирования контента</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {parentCourses.map(course => {
            const levels = childCourses.filter(c => c.parentId === course.id)
            const totalLessons = (levels.length > 0 ? levels : [course]).reduce((s, c) => s + c.chapters.reduce((ch, l) => ch + l.lessons.length, 0), 0)
            const totalSteps = (levels.length > 0 ? levels : [course]).reduce((s, c) => s + c.chapters.reduce((ch, l) => ch + l.lessons.reduce((le, st) => le + st.steps.length, 0), 0), 0)

            return (
              <button key={course.id} onClick={() => setSelectedCourseId(course.id)} style={{
                background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, padding: '18px 20px',
                textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#62a54b'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{course.icon || '📘'}</span>
                  <div>
                    <div style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 600 }}>{course.title}</div>
                    {course.description && <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>{course.description}</div>}
                  </div>
                </div>
                <div style={{ color: '#444', fontSize: 11 }}>
                  {levels.length > 0 ? (
                    <>{levels.length} уровней · </>
                  ) : null}
                  {totalLessons} уроков · {totalSteps} шагов
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Step 2: Course editor ──────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Back button + level tabs */}
      <div style={{ borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={goBack} style={{
          padding: '10px 16px', background: 'transparent', border: 'none', color: '#62a54b',
          cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          borderRight: '1px solid #1e1e1e',
        }}>
          ← Назад к курсам
        </button>

        {activeLevels.length > 0 && (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
            {activeLevels.map(level => (
              editingLevel === level.id ? (
                <div key={level.id} style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '1px solid #1e1e1e' }}>
                  <input
                    style={{ ...S.input, fontSize: 11, padding: '4px 6px' }}
                    value={levelEditTitle}
                    onChange={e => setLevelEditTitle(e.target.value)}
                    placeholder="Название уровня"
                    autoFocus
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        await fetch(`/api/admin/courses/${level.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: levelEditTitle.trim() || level.title, description: levelEditDesc.trim() || null }),
                        })
                        setEditingLevel(null)
                        load()
                      }
                      if (e.key === 'Escape') setEditingLevel(null)
                    }}
                  />
                  <input
                    style={{ ...S.input, fontSize: 10, padding: '3px 6px', color: '#888' }}
                    value={levelEditDesc}
                    onChange={e => setLevelEditDesc(e.target.value)}
                    placeholder="Описание уровня"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        await fetch(`/api/admin/courses/${level.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: levelEditTitle.trim() || level.title, description: levelEditDesc.trim() || null }),
                        })
                        setEditingLevel(null)
                        load()
                      }
                      if (e.key === 'Escape') setEditingLevel(null)
                    }}
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={async () => {
                      await fetch(`/api/admin/courses/${level.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: levelEditTitle.trim() || level.title, description: levelEditDesc.trim() || null }),
                      })
                      setEditingLevel(null)
                      load()
                    }} style={{ ...S.btn('primary'), padding: '3px 8px', fontSize: 10 }}>✓</button>
                    <button onClick={() => setEditingLevel(null)} style={{ ...S.btn(), padding: '3px 8px', fontSize: 10 }}>✕</button>
                  </div>
                </div>
              ) : (
                <button key={level.id} onClick={() => { setActiveLevelId(level.id); setActiveLesson(null) }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setEditingLevel(level.id)
                    setLevelEditTitle(level.title)
                    setLevelEditDesc((level as any).description || '')
                  }}
                  style={{
                    flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: activeLevelId === level.id ? '#1e3a1e' : 'transparent',
                    color: activeLevelId === level.id ? '#62a54b' : '#666',
                    borderBottom: activeLevelId === level.id ? '2px solid #62a54b' : '2px solid transparent',
                  }}
                  title="Двойной клик — редактировать название и описание"
                >
                  {level.title}
                  {(level as any).description && (
                    <div style={{ fontSize: 9, fontWeight: 400, color: '#555', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(level as any).description}
                    </div>
                  )}
                </button>
              )
            ))}
          </div>
        )}
      </div>

      {/* Editor body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Lesson tree */}
        <div style={{ width: 280, borderRight: '1px solid #1e1e1e', overflow: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '8px 0' }}>
            {editedCourse?.chapters.map(ch => (
              <div key={ch.id}>
                <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                  {editingChapterId === ch.id ? (
                    <input
                      style={{ ...S.input, fontSize: 11, padding: '4px 8px', flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                      value={editingChapterTitle}
                      onChange={e => setEditingChapterTitle(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && editingChapterTitle.trim()) {
                          await fetch(`/api/admin/chapters/${ch.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: editingChapterTitle.trim() }),
                          })
                          setEditingChapterId(null)
                          load()
                        }
                        if (e.key === 'Escape') setEditingChapterId(null)
                      }}
                      onBlur={async () => {
                        if (editingChapterTitle.trim() && editingChapterTitle !== ch.title) {
                          await fetch(`/api/admin/chapters/${ch.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: editingChapterTitle.trim() }),
                          })
                          load()
                        }
                        setEditingChapterId(null)
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', cursor: 'pointer', flex: 1 }}
                      onClick={() => { setEditingChapterId(ch.id); setEditingChapterTitle(ch.title) }}
                      title="Нажмите чтобы переименовать"
                    >
                      {ch.title}
                    </span>
                  )}
                  <button onClick={() => setAddingLesson(ch.id)} style={{
                    background: 'transparent', border: 'none', color: '#555', cursor: 'pointer',
                    fontSize: 18, lineHeight: 1, padding: '0 4px', borderRadius: 4,
                  }} title="Добавить урок">+</button>
                  <button onClick={async () => {
                    setConfirmModal({
                      title: 'Удалить главу?',
                      message: `Удалить главу "${ch.title}" и все её уроки? Это действие необратимо.`,
                      onConfirm: async () => {
                        await fetch(`/api/admin/chapters/${ch.id}`, { method: 'DELETE' })
                        setConfirmModal(null)
                        load()
                      },
                    })
                  }} style={{
                    background: 'transparent', border: 'none', color: '#3a1a1a', cursor: 'pointer',
                    fontSize: 13, padding: '2px 4px', lineHeight: 1, borderRadius: 4, transition: 'color 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f87171'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#3a1a1a'}
                    title="Удалить главу">🗑</button>
                </div>
                {ch.lessons.map(lesson => (
                  <div key={lesson.id} style={{
                    display: 'flex', alignItems: 'center',
                    background: activeLesson?.id === lesson.id ? '#1a2a1a' : 'transparent',
                    borderLeft: activeLesson?.id === lesson.id ? '2px solid #62a54b' : '2px solid transparent',
                  }}>
                    <button onClick={() => setActiveLesson(lesson)} style={{
                      flex: 1, textAlign: 'left', padding: '8px 8px 8px 20px',
                      background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13,
                      color: activeLesson?.id === lesson.id ? '#62a54b' : '#bbb',
                    }}>
                      {lesson.title}
                      <span style={{ marginLeft: 6, fontSize: 10, color: '#555' }}>({lesson.steps.length})</span>
                    </button>
                    <button onClick={() => deleteLesson(lesson.id)} style={{
                      background: 'transparent', border: 'none', color: '#3a1a1a', cursor: 'pointer',
                      fontSize: 13, padding: '4px 8px', flexShrink: 0, borderRadius: 4, transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f87171'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#3a1a1a'}
                      title="Удалить урок">🗑</button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Add chapter button */}
          <div style={{ padding: '8px 14px' }}>
            {addingChapter ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  style={{ ...S.input, fontSize: 12, padding: '6px 8px', flex: 1 }}
                  value={newChapterTitle}
                  onChange={e => setNewChapterTitle(e.target.value)}
                  placeholder="Название главы"
                  autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newChapterTitle.trim() && editedCourse) {
                      await fetch('/api/admin/chapters', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ courseId: editedCourse.id, title: newChapterTitle.trim() }),
                      })
                      setAddingChapter(false)
                      setNewChapterTitle('')
                      load()
                    }
                    if (e.key === 'Escape') { setAddingChapter(false); setNewChapterTitle('') }
                  }}
                />
                <button onClick={async () => {
                  if (newChapterTitle.trim() && editedCourse) {
                    await fetch('/api/admin/chapters', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ courseId: editedCourse.id, title: newChapterTitle.trim() }),
                    })
                    setAddingChapter(false)
                    setNewChapterTitle('')
                    load()
                  }
                }} style={{ ...S.btn('primary'), padding: '6px 10px', fontSize: 12 }}>✓</button>
                <button onClick={() => { setAddingChapter(false); setNewChapterTitle('') }} style={{ ...S.btn(), padding: '6px 10px', fontSize: 12 }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setAddingChapter(true)} style={{
                width: '100%', padding: '8px', background: 'transparent', border: '1px dashed #2a2a2a',
                borderRadius: 6, color: '#555', cursor: 'pointer', fontSize: 12, textAlign: 'center',
              }}>
                + Добавить главу
              </button>
            )}
          </div>
        </div>

        {/* Step list */}
        <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>
          {!activeLesson ? (
            <div style={{ color: '#555', paddingTop: 60, textAlign: 'center', fontSize: 14 }}>
              Выбери урок слева
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{activeLesson.title}</h2>
                  <p style={{ color: '#555', fontSize: 13, marginTop: 4 }}>{activeLesson.steps.length} шагов</p>
                </div>
                <button onClick={() => setAddingStep(true)} style={S.btn('primary')}>
                  + Добавить шаг
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeLesson.steps.map((step, i) => {
                  const stepKey = `${activeLesson.id}_${i}`
                  const hasAudio = !!audioMap[stepKey]
                  const isDragOver = audioDragOver === stepKey

                  return (
                  <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <div style={{
                      background: '#161616', border: '1px solid #222', borderRadius: hasAudio ? '10px 10px 0 0' : 10, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#222'}
                    >
                    <span style={{ color: '#666', fontSize: 11, width: 20, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{stepIcon(step.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500 }}>{step.title}</div>
                      {step.type === 'quiz' && step.question && (
                        <div style={{ color: '#555', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                          {step.question}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      background: step.type === 'quiz' ? '#1a1a2e' : step.type === 'practice' ? '#1a2a1a' : '#1e1e1e',
                      color: step.type === 'quiz' ? '#667eea' : step.type === 'practice' ? '#62a54b' : '#666',
                    }}>
                      {step.type}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button onClick={() => reorderStep(step.id, 'up')} disabled={i === 0} style={{
                        background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4,
                        color: i === 0 ? '#333' : '#666', cursor: i === 0 ? 'default' : 'pointer',
                        fontSize: 10, padding: '2px 6px', lineHeight: 1,
                      }}>▲</button>
                      <button onClick={() => reorderStep(step.id, 'down')} disabled={i === activeLesson.steps.length - 1} style={{
                        background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 4,
                        color: i === activeLesson.steps.length - 1 ? '#333' : '#666', cursor: i === activeLesson.steps.length - 1 ? 'default' : 'pointer',
                        fontSize: 10, padding: '2px 6px', lineHeight: 1,
                      }}>▼</button>
                    </div>
                    <button onClick={() => setPreviewStep(step)} style={{
                      background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
                      color: '#666', cursor: 'pointer', fontSize: 12, padding: '4px 8px',
                    }} title="Предпросмотр">👁</button>
                    {step.type !== 'practice' && (
                      <button onClick={() => setEditStep(step)} style={{
                        background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
                        color: '#666', cursor: 'pointer', fontSize: 12, padding: '4px 8px',
                      }} title="Редактировать">✏️</button>
                    )}
                    </div>

                    {/* Per-step audio zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setAudioDragOver(stepKey) }}
                      onDragLeave={() => setAudioDragOver(false)}
                      onDrop={e => {
                        e.preventDefault()
                        const file = e.dataTransfer.files[0]
                        if (file) uploadAudio(file, activeLesson.id, i)
                      }}
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'audio/mp3,audio/mpeg,audio/m4a,audio/x-m4a,audio/mp4,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg'
                        input.onchange = (e: any) => {
                          const file = e.target.files[0]
                          if (file) uploadAudio(file, activeLesson.id, i)
                        }
                        input.click()
                      }}
                      style={{
                        borderRadius: '0 0 10px 10px',
                        border: isDragOver ? '1px dashed #62a54b' : '1px dashed #1e1e1e',
                        borderTop: 'none',
                        background: isDragOver ? '#0d1f0d' : hasAudio ? '#0f1a0f' : '#111',
                        padding: '7px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: 13 }}>🔊</span>
                      {audioUploading === stepKey ? (
                        <span style={{ color: '#62a54b', fontSize: 11 }}>Загрузка...</span>
                      ) : hasAudio ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                          <span style={{ color: '#62a54b', fontSize: 11, fontWeight: 600 }}>✓ {audioMap[stepKey]}</span>
                          <audio controls src={`/audio/${audioMap[stepKey]}`}
                            style={{ height: 22, flex: 1 }}
                            onClick={e => e.stopPropagation()} />
                          <button
                            onClick={e => { e.stopPropagation(); removeAudio(activeLesson.id, i) }}
                            style={{ ...S.btn('danger'), padding: '2px 7px', fontSize: 10, flexShrink: 0 }}
                          >Удалить</button>
                        </div>
                      ) : (
                        <span style={{ color: isDragOver ? '#62a54b' : '#3a3a3a', fontSize: 11 }}>
                          {isDragOver ? 'Отпусти для загрузки' : 'Перетащи аудио (mp3, m4a) или нажми'}
                        </span>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {previewStep && (
        <StepPreview step={previewStep} onClose={() => setPreviewStep(null)} />
      )}

      {editStep && (
        <StepEditor
          step={editStep}
          onSave={() => { setEditStep(null); load() }}
          onDelete={() => setConfirmModal({
            title: 'Удалить шаг?',
            message: 'Удалить этот шаг? Это действие необратимо.',
            onConfirm: () => { deleteStep(editStep.id); setConfirmModal(null) },
          })}
          onClose={() => setEditStep(null)}
        />
      )}

      {addingStep && activeLesson && (
        <AddStepModal
          lessonId={activeLesson.id}
          onAdd={load}
          onClose={() => setAddingStep(false)}
        />
      )}

      {addingLesson && (
        <AddLessonModal
          chapterId={addingLesson}
          onAdd={load}
          onClose={() => setAddingLesson(null)}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel="Удалить"
          danger
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
