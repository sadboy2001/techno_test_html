// app/api/admin/courses/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const courses = await prisma.course.findMany({
    orderBy: { order: 'asc' },
    include: {
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' },
            include: {
              steps: { orderBy: { order: 'asc' } }
            }
          }
        }
      }
    }
  })

  return NextResponse.json(courses)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { id, title, description, icon, levels, levelNames } = body

    if (!id || !title) {
      return NextResponse.json(
        { error: 'id и title обязательны' },
        { status: 400 }
      )
    }

    // Check for duplicate
    const existing = await prisma.course.findUnique({ where: { id } })
    if (existing) {
      return NextResponse.json(
        { error: 'Курс с таким ID уже существует' },
        { status: 409 }
      )
    }

    // Get max order
    const maxOrder = await prisma.course.aggregate({ _max: { order: true } })
    const nextOrder = (maxOrder._max.order ?? -1) + 1

    const numLevels = parseInt(levels) || 1

    if (numLevels > 1) {
      // Create parent course
      const parent = await prisma.course.create({
        data: {
          id,
          title,
          description: description || null,
          icon: icon || null,
          order: nextOrder,
        },
      })

        const levelIcons = ['📘', '🚀', '🎓']

        // Create level courses
        for (let i = 0; i < numLevels; i++) {
          const levelId = `${id}_level_${i + 1}`
          const levelTitle = (levelNames && levelNames[i]) || `Уровень ${i + 1}`

          const levelCourse = await prisma.course.create({
            data: {
              id: levelId,
              title: levelTitle,
              icon: levelIcons[i] || '📄',
              order: nextOrder + i + 1,
              parentId: id,
            },
          })

        // Auto-create first chapter for each level
        await prisma.chapter.create({
          data: {
            id: `${levelId}_ch1`,
            courseId: levelId,
            title: 'Глава 1',
            order: 0,
          },
        })
      }

      return NextResponse.json(parent, { status: 201 })
    } else {
      // Single course (no levels)
      const course = await prisma.course.create({
        data: {
          id,
          title,
          description: description || null,
          icon: icon || null,
          order: nextOrder,
        },
      })

      await prisma.chapter.create({
        data: {
          id: `${id}_ch1`,
          courseId: id,
          title: 'Глава 1',
          order: 0,
        },
      })

      return NextResponse.json(course, { status: 201 })
    }
  } catch (err) {
    console.error('[/api/admin/courses POST]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
