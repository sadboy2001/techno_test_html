'use client'

import { useState, useRef, useEffect } from 'react'

type Props = {
  value: string
  onChange: (date: string) => void
  placeholder?: string
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export default function MiniCalendar({ value, onChange, placeholder = 'Дата' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const date = value ? new Date(value) : new Date()
  const [viewYear, setViewYear] = useState(date.getFullYear())
  const [viewMonth, setViewMonth] = useState(date.getMonth())

  useEffect(() => {
    if (value) {
      const d = new Date(value)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (day: number) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(d)
    setOpen(false)
  }

  const clear = () => { onChange(''); setOpen(false) }

  const displayValue = value ? formatDisplayDate(value) : ''

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: '5px 8px', borderRadius: 6, border: '1px solid #2a2a2a', background: '#0f0f0f',
        color: value ? '#e0e0e0' : '#555', fontSize: 12, cursor: 'pointer', minWidth: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <span>{displayValue || placeholder}</span>
        <span style={{ fontSize: 10, color: '#555' }}>📅</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: 10, width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button onClick={prevMonth} style={navBtn}>◀</button>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#e0e0e0' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={navBtn}>▶</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ fontSize: 9, color: '#555', textAlign: 'center', padding: '2px 0', fontWeight: 600 }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isSelected = value === d
              return (
                <div key={day} onClick={() => selectDay(day)} style={{
                  fontSize: 11, textAlign: 'center', padding: '4px 0', borderRadius: 4,
                  cursor: 'pointer', color: isSelected ? '#fff' : '#bbb',
                  background: isSelected ? '#62a54b' : 'transparent',
                  fontWeight: isSelected ? 600 : 400,
                }}
                  onMouseEnter={e => { if (!isSelected) (e.target as HTMLElement).style.background = '#1e3a1e' }}
                  onMouseLeave={e => { if (!isSelected) (e.target as HTMLElement).style.background = 'transparent' }}
                >
                  {day}
                </div>
              )
            })}
          </div>

          {value && (
            <div onClick={clear} style={{
              textAlign: 'center', fontSize: 11, color: '#888', cursor: 'pointer',
              padding: '4px 0', borderTop: '1px solid #2a2a2a', marginTop: 8,
            }}>
              ✕ Очистить
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

const navBtn = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 12, padding: '2px 6px', borderRadius: 4,
}
