// app/[courseId]/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CourseApp } from '@/components/CourseApp'

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { courseId } = params

  // Verify course exists as parent/standalone
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course || course.parentId) {
    // Not a valid parent course — redirect to user's course or testing
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    redirect(`/testing`)
  }

  return <CourseApp />
}
