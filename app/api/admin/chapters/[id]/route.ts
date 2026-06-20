// app/api/admin/chapters/[id]/route.ts
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
    const { title } = body

    const chapter = await prisma.chapter.findUnique({ where: { id: params.id } })
    if (!chapter) {
      return NextResponse.json({ error: 'Глава не найдена' }, { status: 404 })
    }

    const updated = await prisma.chapter.update({
      where: { id: params.id },
      data: { ...(title !== undefined && { title }) },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[/api/admin/chapters PATCH]', err)
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
    const chapter = await prisma.chapter.findUnique({ where: { id: params.id } })
    if (!chapter) {
      return NextResponse.json({ error: 'Глава не найдена' }, { status: 404 })
    }

    await prisma.chapter.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/admin/chapters DELETE]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
