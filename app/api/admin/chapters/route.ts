// app/api/admin/chapters/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const { courseId, title } = await request.json()
    if (!courseId || !title) {
      return NextResponse.json({ error: 'courseId и title обязательны' }, { status: 400 })
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 })
    }

    const last = await prisma.chapter.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    })
    const order = (last?.order ?? -1) + 1

    const chapterCount = await prisma.chapter.count({ where: { courseId } })
    const chapter = await prisma.chapter.create({
      data: {
        id: `${courseId}_ch${chapterCount + 1}`,
        courseId,
        title,
        order,
      },
    })

    return NextResponse.json(chapter, { status: 201 })
  } catch (err) {
    console.error('[/api/admin/chapters POST]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
