'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type CourseInfo = {
  id: string
  title: string
  description?: string | null
  icon?: string | null
  levels?: { id: string; title: string; icon?: string | null; description?: string | null }[] | null
}

export function CourseApp() {
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [courseLevels, setCourseLevels] = useState<{ id: string; title: string; icon?: string | null; description?: string | null }[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const scriptLoaded = useRef(false)
  const pathname = usePathname()

  const userCourseId = (session?.user as any)?.courseId
  const isAdmin = (session?.user as any)?.role === 'admin'
  // courseId from URL: /{courseId} — first path segment
  const urlCourseId = pathname && pathname !== '/' ? pathname.split('/')[1] : null
  const courseId = urlCourseId || userCourseId || 'testing'

  useEffect(() => {
    if (status === 'loading') return
    if (scriptLoaded.current) return
    scriptLoaded.current = true

    const existing = document.getElementById('course-main-js')
    if (existing) existing.remove()

    ;(window as any).__USER_ROLE__ = session?.user?.role || 'user'
    ;(window as any).__USER_COURSE_ID__ = courseId

    fetch('/api/courses')
      .then(r => r.json())
      .then((courses: CourseInfo[]) => {
        const myCourse = courses.find(c => c.id === courseId)
        const myLevels = myCourse?.levels || []
        const hasLevels = myLevels.length > 0

        let levelsToShow: { id: string; title: string; icon?: string | null; description?: string | null }[] = []

        if (hasLevels) {
          levelsToShow = myLevels
        } else if (isAdmin) {
          levelsToShow = courses
            .filter(c => c.levels && c.levels.length > 0)
            .flatMap(c => [
              { id: c.id, title: c.title, icon: c.icon },
              ...(c.levels || []).map(l => ({ id: l.id, title: `${c.title} — ${l.title}`, icon: l.icon })),
            ])
          courses.filter(c => !c.levels).forEach(c => {
            levelsToShow.push({ id: c.id, title: c.title, icon: c.icon })
          })
        }

        const show = levelsToShow.length > 0

        setShowSwitcher(show)
        setCourseLevels(levelsToShow)
        setCourseTitle(myCourse?.title || (isAdmin && courses.length > 0 ? 'Все курсы' : ''))

        ;(window as any).__SHOW_COURSE_SWITCHER__ = show
        ;(window as any).__COURSE_LEVEL_IDS__ = hasLevels
          ? myLevels.map(l => l.id)
          : null
        ;(window as any).__COURSE_LEVELS__ = hasLevels ? myLevels : []
        ;(window as any).__DROPDOWN_ITEMS__ = levelsToShow

        const script = document.createElement('script')
        script.id = 'course-main-js'
        script.src = '/main.js?v=' + Date.now()
        script.async = false
        document.body.appendChild(script)
      })
      .catch(() => {
        setShowSwitcher(isAdmin)
        ;(window as any).__SHOW_COURSE_SWITCHER__ = isAdmin
        ;(window as any).__COURSE_LEVEL_IDS__ = null
        ;(window as any).__COURSE_LEVELS__ = []

        const script = document.createElement('script')
        script.id = 'course-main-js'
        script.src = '/main.js?v=' + Date.now()
        script.async = false
        document.body.appendChild(script)
      })
  }, [status])

  const handleToggleDropdown = () => {
    if (typeof (window as any).toggleCourseDropdown === 'function') {
      (window as any).toggleCourseDropdown()
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (typeof (window as any).searchLessons === 'function') {
      (window as any).searchLessons(e.target.value)
    }
  }

  return (
    <div className="app-root">
      {/* Course dropdown — dynamic levels */}
      {showSwitcher && courseLevels.length > 0 && (
      <div className="course-dropdown" id="course-dropdown">
        <div className="course-dropdown-label">Выберите уровень</div>
        {courseLevels.map((level, i) => (
          <div key={level.id}
            className={`course-option co-${level.id} ${i === 0 ? '' : 'locked-course'}`}
            id={`co-${level.id}`}
            onClick={() => (window as any).switchCourse?.(level.id)}>
            <div className="course-option-icon">{level.icon || '📄'}</div>
            <div className="course-option-body">
              <div className="course-option-title">{level.title}</div>
              <div className="course-option-sub">{level.description || `Уровень ${i + 1} из ${courseLevels.length}`}</div>
            </div>
            <span className={`course-option-badge ${i === 0 ? 'badge-active' : 'badge-new'}`}
              id={`co-${level.id}-badge`}>
              {i === 0 ? 'Текущий' : 'Новый'}
            </span>
          </div>
        ))}
      </div>
      )}

      {/* Main layout */}
      <div className="app-container">
        {/* Sidebar toggle button */}
        <button className="sidebar-toggle" id="sidebarToggle" title="Свернуть/развернуть меню">
          <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
            <path d="M8 1L2 7L8 13" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Sidebar */}
        <aside className="sidebar" id="sidebar">

          {/* ── Mobile bottom bar (visible only on mobile) ── */}
          <div className="mobile-bottom-bar" style={{display:'none'}}>
            <div className="mbb-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent-green)">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
              </svg>
            </div>
            <div className="mbb-title" id="mbb-title">Загрузка...</div>
            <div className="mbb-dots" id="mbb-dots"/>
            <button className="mbb-menu-btn" id="mbb-menu-btn" title="Меню курса">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Top: logo + course switcher */}
          <div className="sidebar-top">
            <div className="sidebar-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--accent-green)">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
              </svg>
              <span className="sidebar-logo-text">техноград</span>
            </div>

            {/* Course switcher button */}
            {showSwitcher && (
            <button className="sidebar-course-btn" id="course-switcher-btn" onClick={handleToggleDropdown} title="Переключить уровень">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
              <span className="sidebar-course-label" id="sidebar-course-title">{courseTitle || 'Курс'}</span>
              <span className="switcher-arrow" id="switcher-arrow">▾</span>
            </button>
            )}

            {/* Search */}
            <div className="sidebar-search">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="sidebar-search-input"
                type="text"
                placeholder="Поиск по темам…"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            {/* Progress */}
            <div className="sidebar-progress">
              <div className="progress-label">
                <span>Прогресс</span>
                <span id="progress-text">0/100</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" id="progress-bar" style={{ width: '0%' }}/>
              </div>
            </div>
          </div>

          {/* Nav list */}
          <ul className="nav-list" id="nav-list"/>

          {/* Bottom: profile */}
          <div className="sidebar-bottom">
            {status !== 'loading' && (
              session ? (
                <div className="sidebar-profile">
                  <div className="profile-avatar">
                    {(session.user?.name || session.user?.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">{session.user?.name || 'Пользователь'}</div>
                    <div className="profile-email">{session.user?.email}</div>
                  </div>
                  <div className="profile-actions">
                    <Link href="/profile" className="profile-action-btn" title="Профиль">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </Link>
                    <button className="profile-action-btn" title="Выйти"
                      onClick={() => signOut({ callbackUrl: '/login' })}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="sidebar-auth-links">
                  <Link href="/login" className="sidebar-auth-btn sidebar-auth-secondary">Войти</Link>
                  <Link href="/register" className="sidebar-auth-btn sidebar-auth-primary">Регистрация</Link>
                </div>
              )
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">
          <div className="steps-bar">
            <div className="step-title" id="step-title">Загрузка...</div>
            <div className="steps-indicators" id="steps-indicators"/>
          </div>

          <div className="content-body" id="content-body"/>
        </main>
      </div>
    </div>
  )
}
