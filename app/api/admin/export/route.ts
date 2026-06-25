// app/api/admin/export/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const LEVEL_NAMES: Record<string, string> = {
  basic: 'Базовый',
  advanced: 'Продвинутый',
  final: 'Финальный',
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')
  const filterCourse = searchParams.get('course')

  const where: any = {}
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      where.createdAt.lte = to
    }
  }
  if (filterCourse) {
    where.courseId = filterCourse
  }

  const [users, allCourses] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { progress: true },
    }),
    prisma.course.findMany({
      include: {
        chapters: {
          include: {
            lessons: {
              include: {
                steps: { select: { id: true } }
              }
            }
          }
        }
      }
    }),
  ])

  // Total steps per course ID
  const totalStepsMap: Record<string, number> = {}
  for (const course of allCourses) {
    let total = 0
    for (const ch of course.chapters) {
      for (const lesson of ch.lessons) {
        total += lesson.steps.length
      }
    }
    totalStepsMap[course.id] = total
  }

  // Find all level course IDs (children with parentId)
  const levelCourseIds = allCourses
    .filter(c => c.parentId)
    .map(c => c.id)

  const rows = users.map(user => {
    const courseId = user.courseId || ''

    // Build progress per level
    const progressByLevel: Record<string, { completed: number; total: number; percent: number }> = {}

    for (const p of user.progress) {
      const levelId = p.course
      const completed = (() => { try { return JSON.parse(p.completedSteps).length } catch { return 0 } })()
      const total = totalStepsMap[levelId] || 0
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0
      progressByLevel[levelId] = { completed, total, percent }
    }

    // Total across all levels
    let totalCompleted = 0
    let totalAll = 0
    for (const lvl of levelCourseIds) {
      const pr = progressByLevel[lvl]
      if (pr) {
        totalCompleted += pr.completed
        totalAll += pr.total
      }
    }
    const overallPercent = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0

    // Build row
    const row: Record<string, any> = {
      'Имя': user.name || '',
      'Email': user.email,
      'Роль': user.role,
      'Курс': courseId,
      'Пройдено (всего)': totalCompleted,
      'Всего этапов': totalAll,
      'Общий прогресс': totalAll > 0 ? `${overallPercent}%` : '—',
    }

    // Add per-level columns
    for (const lvl of levelCourseIds) {
      const pr = progressByLevel[lvl]
      const name = LEVEL_NAMES[lvl] || lvl
      row[`${name}: пройдено`] = pr ? pr.completed : 0
      row[`${name}: этапов`] = pr ? pr.total : (totalStepsMap[lvl] || 0)
      row[`${name}: прогресс`] = pr ? `${pr.percent}%` : '—'
    }

    // Last lesson info
    const lastLessons = user.progress
      .filter(p => p.lastLessonId)
      .map(p => `${LEVEL_NAMES[p.course] || p.course}: ${p.lastLessonId}`)
    row['Последние уроки'] = lastLessons.join(', ') || '—'
    row['Дата регистрации'] = new Date(user.createdAt).toLocaleDateString('ru-RU')

    return row
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-fit columns
  const keys = Object.keys(rows[0] || {})
  ws['!cols'] = keys.map(k => {
    if (k.includes('Email')) return { wch: 30 }
    if (k.includes('прогресс') || k.includes('Прогресс')) return { wch: 12 }
    if (k.includes('этапов') || k.includes('пройдено')) return { wch: 12 }
    if (k.includes('Последние')) return { wch: 40 }
    if (k.includes('Дата')) return { wch: 16 }
    return { wch: 18 }
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Студенты')

  const dateStr = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="students_${dateStr}.xlsx"`,
    },
  })
}
