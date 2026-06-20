// app/api/admin/courses/[id]/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { title, description, icon, order } = body

    const course = await prisma.course.findUnique({ where: { id: params.id } })
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 })
    }

    const updated = await prisma.course.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[/api/admin/courses PATCH]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const course = await prisma.course.findUnique({ where: { id: params.id } })
    if (!course) {
      return NextResponse.json({ error: 'Курс не найден' }, { status: 404 })
    }

    // Find children before deleting
    const children = await prisma.course.findMany({ where: { parentId: params.id } })
    const childIds = children.map(c => c.id)
    const allIds = [params.id, ...childIds]

    // Unassign users from this course before deleting
    await prisma.user.updateMany({ where: { courseId: { in: allIds } }, data: { courseId: null } })

    // Delete children first, then parent
    if (childIds.length > 0) {
      await prisma.course.deleteMany({ where: { id: { in: childIds } } })
    }
    await prisma.course.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/admin/courses DELETE]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
