// app/api/admin/export/route.ts
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

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

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      progress: true,
    },
  })

  const rows = users.map(user => {
    const totalSteps = user.progress.reduce((acc, p) => {
      try { return acc + JSON.parse(p.completedSteps).length } catch { return acc }
    }, 0)

    return {
      'Имя': user.name || '',
      'Email': user.email,
      'Роль': user.role,
      'Курс': user.courseId || '',
      'Шагов пройдено': totalSteps,
      'Дата регистрации': new Date(user.createdAt).toLocaleDateString('ru-RU'),
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Пользователи')

  const dateStr = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="users_${dateStr}.xlsx"`,
    },
  })
}
