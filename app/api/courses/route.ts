// app/api/courses/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const allCourses = await prisma.course.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      icon: true,
      parentId: true,
    },
  })

  // Parent courses (or standalone) = courses with no parentId
  const parentCourses = allCourses.filter(c => !c.parentId)
  // Levels = courses with a parentId
  const childCourses = allCourses.filter(c => c.parentId)

  const result = parentCourses.map(parent => {
    const levels = childCourses
      .filter(c => c.parentId === parent.id)
      .map(c => ({ id: c.id, title: c.title, icon: c.icon, description: c.description }))

    return {
      id: parent.id,
      title: parent.title,
      description: parent.description,
      icon: parent.icon,
      levels: levels.length > 0 ? levels : null,
    }
  })

  return NextResponse.json(result)
}
