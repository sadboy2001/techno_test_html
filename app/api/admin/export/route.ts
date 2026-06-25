// app/api/admin/export/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const COURSE_NAMES: Record<string, string> = {
  testing: 'Тестирование ПО',
  basic: 'Тестирование ПО — Базовый',
  advanced: 'Тестирование ПО — Продвинутый',
  final: 'Тестирование ПО — Финальный',
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')

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

  const [users, courses] = await Promise.all([
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

  // Build total steps per course
  const courseTotalSteps: Record<string, number> = {}
  for (const course of courses) {
    let total = 0
    for (const ch of course.chapters) {
      for (const lesson of ch.lessons) {
        total += lesson.steps.length
      }
    }
    courseTotalSteps[course.id] = total
  }

  const rows = users.map(user => {
    // Find the user's course
    const courseId = user.courseId || ''
    const courseTitle = COURSE_NAMES[courseId] || courseId

    // Calculate progress
    let completedSteps = 0
    let totalSteps = 0
    let lastLesson = ''

    for (const p of user.progress) {
      try {
        const steps = JSON.parse(p.completedSteps)
        completedSteps += steps.length
      } catch {}
      if (p.lastLessonId) lastLesson = p.lastLessonId
    }

    // For testing course, sum all 3 levels
    if (courseId === 'testing') {
      for (const p of user.progress) {
        const courseSteps = courseTotalSteps[p.course] || 0
        totalSteps += courseSteps
      }
    } else {
      // For standalone courses, sum all levels
      const parentCourse = courses.find(c => c.id === courseId)
      if (parentCourse) {
        // Check if it has levels (children)
        const childCourses = courses.filter(c => c.parentId === courseId)
        if (childCourses.length > 0) {
          for (const child of childCourses) {
            totalSteps += courseTotalSteps[child.id] || 0
          }
        } else {
          totalSteps = courseTotalSteps[courseId] || 0
        }
      }
    }

    const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

    return {
      'Имя': user.name || '',
      'Email': user.email,
      'Роль': user.role,
      'Курс': courseTitle,
      'Этапов пройдено': completedSteps,
      'Всего этапов': totalSteps,
      'Прогресс': totalSteps > 0 ? `${percent}%` : '—',
      'Последний урок': lastLesson,
      'Дата регистрации': new Date(user.createdAt).toLocaleDateString('ru-RU'),
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 10 },
    { wch: 25 },
    { wch: 14 },
    { wch: 13 },
    { wch: 10 },
    { wch: 25 },
    { wch: 18 },
  ]

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
