// app/api/register/route.ts
import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const registerSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(50),
  email: z.string().email('Некорректный email'),
  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(100),
  courseId: z.string().min(1, 'Выберите курс'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password, courseId } = parsed.data

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      )
    }

    // Validate courseId: must be a parent/standalone course (not a child level)
    if (courseId !== 'testing') {
      const course = await prisma.course.findUnique({ where: { id: courseId } })
      if (!course) {
        return NextResponse.json(
          { error: 'Выбранный курс не найден' },
          { status: 400 }
        )
      }
      // Cannot register for a child level directly
      if (course.parentId) {
        return NextResponse.json(
          { error: 'Выберите основной курс, а не уровень' },
          { status: 400 }
        )
      }
    }

    // Hash password (cost factor 12)
    const hashedPassword = await hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, courseId },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error('[/api/register]', err)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
