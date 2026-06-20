'use client'
// app/register/page.tsx

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type CourseOption = {
  id: string
  title: string
  description?: string | null
  icon?: string | null
  levels?: { id: string; title: string }[] | null
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [courseId, setCourseId] = useState('')
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCourses(data)
          if (data.length > 0 && !courseId) setCourseId(data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }

    if (!courseId) {
      setError('Выберите курс')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, courseId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации')
        setLoading(false)
        return
      }

      router.push('/login?registered=1')
    } catch {
      setError('Ошибка соединения с сервером')
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-logo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" />
            <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" />
          </svg>
          техноград
        </Link>

        <h1 className="auth-title">Создать аккаунт</h1>
        <p className="auth-subtitle">Регистрируйтесь, чтобы сохранять прогресс</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="auth-field">
            <label className="auth-label" htmlFor="name">Имя</label>
            <input
              id="name"
              type="text"
              className="auth-input"
              placeholder="Иван Иванов"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              Пароль <span style={{ color: '#666', fontWeight: 'normal' }}>(минимум 8 символов)</span>
            </label>
            <input
              id="password"
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="course">Курс</label>
            <select
              id="course"
              className="auth-input"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              required
            >
              {courses.length === 0 && <option value="">Загрузка курсов...</option>}
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.icon || '📘'} {c.title}
                </option>
              ))}
            </select>
            {courses.find(c => c.id === courseId)?.description && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {courses.find(c => c.id === courseId)?.description}
              </div>
            )}
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-footer">
          Уже есть аккаунт?{' '}
          <Link href="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}
