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

  const dateWhere: any = {}
  if (dateFrom || dateTo) {
    dateWhere.createdAt = {}
    if (dateFrom) dateWhere.createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      dateWhere.createdAt.lte = to
    }
  }

  const allCourses = await prisma.course.findMany({
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
  })

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
  const levelCourseIds = allCourses.filter(c => c.parentId).map(c => c.id)

  // Build user filter based on course/level selection
  let users: any[] = []

  if (filterCourse) {
    // Check if it's a parent course or a level
    const isParentCourse = allCourses.some(c => c.id === filterCourse && !c.parentId)
    const isLevel = allCourses.some(c => c.id === filterCourse && c.parentId)

    if (isLevel) {
      // Filter by level: find users who have progress in this specific level
      users = await prisma.user.findMany({
        where: {
          ...dateWhere,
          progress: { some: { course: filterCourse } },
        },
        orderBy: { createdAt: 'desc' },
        include: { progress: true },
      })
    } else if (isParentCourse) {
      // Filter by parent course: find users with courseId matching
      users = await prisma.user.findMany({
        where: { ...dateWhere, courseId: filterCourse },
        orderBy: { createdAt: 'desc' },
        include: { progress: true },
      })
    } else {
      users = await prisma.user.findMany({
        where: dateWhere,
        orderBy: { createdAt: 'desc' },
        include: { progress: true },
      })
    }
  } else {
    users = await prisma.user.findMany({
      where: dateWhere,
      orderBy: { createdAt: 'desc' },
      include: { progress: true },
    })
  }

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

    // Determine which levels to show columns for
    const isLevelFilter = filterCourse && levelCourseIds.includes(filterCourse)
    const isParentFilter = filterCourse && !isLevelFilter && allCourses.some(c => c.id === filterCourse && !c.parentId)
    const levelsToShow = isLevelFilter ? [filterCourse] : (isParentFilter ? levelCourseIds.filter(l => {
      const parent = allCourses.find(c => c.id === l)
      return parent?.parentId === filterCourse
    }) : levelCourseIds)

    // Total across filtered levels
    let totalCompleted = 0
    let totalAll = 0
    for (const lvl of levelsToShow) {
      const pr = progressByLevel[lvl]
      if (pr) {
        totalCompleted += pr.completed
        totalAll += pr.total
      }
    }
    const overallPercent = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0

    const row: Record<string, any> = {
      'Имя': user.name || '',
      'Email': user.email,
      'Роль': user.role,
      'Курс': courseId,
    }

    // Add per-level columns only for filtered levels
    if (levelsToShow.length === 1) {
      const lvl = levelsToShow[0]
      const pr = progressByLevel[lvl]
      const name = LEVEL_NAMES[lvl] || lvl
      row['Пройдено'] = pr ? pr.completed : 0
      row['Всего этапов'] = pr ? pr.total : (totalStepsMap[lvl] || 0)
      row['Прогресс'] = pr ? `${pr.percent}%` : '—'
    } else if (levelsToShow.length > 1) {
      row['Пройдено (всего)'] = totalCompleted
      row['Всего этапов'] = totalAll
      row['Общий прогресс'] = totalAll > 0 ? `${overallPercent}%` : '—'
      for (const lvl of levelsToShow) {
        const pr = progressByLevel[lvl]
        const name = LEVEL_NAMES[lvl] || lvl
        row[`${name}: пройдено`] = pr ? pr.completed : 0
        row[`${name}: этапов`] = pr ? pr.total : (totalStepsMap[lvl] || 0)
        row[`${name}: прогресс`] = pr ? `${pr.percent}%` : '—'
      }
    } else {
      row['Пройдено (всего)'] = totalCompleted
      row['Всего этапов'] = totalAll
      row['Общий прогресс'] = totalAll > 0 ? `${overallPercent}%` : '—'
    }

    // Last lesson info (filtered)
    const lastLessons = user.progress
      .filter((p: any) => p.lastLessonId && levelsToShow.includes(p.course))
      .map((p: any) => `${LEVEL_NAMES[p.course] || p.course}: ${p.lastLessonId}`)
    row['Последние уроки'] = lastLessons.join(', ') || '—'
    row['Дата регистрации'] = new Date(user.createdAt).toLocaleDateString('ru-RU')

    return row
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'Имя': 'Нет данных по фильтру' }])

  const keys = Object.keys(rows[0] || { 'Имя': '' })
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
