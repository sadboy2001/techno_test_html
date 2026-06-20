// prisma/seed.mjs
// Parses course data from main.js and seeds the Neon database
// Run: node prisma/seed.mjs

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const prisma = new PrismaClient()

// ── Extract content from main.js ──────────────────────────────
const mainJs = readFileSync('./public/main.js', 'utf-8')

// Run the IIFE in a sandbox to extract data
// We wrap just the data portion and eval it carefully
function extractObject(src, varName) {
  // Find "const varName = {" and extract the full object
  const startPattern = new RegExp(`const ${varName}\\s*=\\s*\\[`)
  const match = src.match(startPattern)
  if (!match) return null
  const start = src.indexOf(match[0])
  
  // Find matching bracket
  let depth = 0
  let i = src.indexOf('[', start)
  const begin = i
  while (i < src.length) {
    if (src[i] === '[' || src[i] === '{') depth++
    if (src[i] === ']' || src[i] === '}') depth--
    if (depth === 0) break
    i++
  }
  return src.slice(begin, i + 1)
}

function extractContentObj(src, varName) {
  const startPattern = new RegExp(`const ${varName}\\s*=\\s*\\{`)
  const match = src.match(startPattern)
  if (!match) return null
  const start = src.indexOf(match[0])
  let depth = 0
  let i = src.indexOf('{', start)
  const begin = i
  while (i < src.length) {
    if (src[i] === '{') depth++
    if (src[i] === '}') depth--
    if (depth === 0) break
    i++
  }
  return src.slice(begin, i + 1)
}

// Build content maps
console.log('Extracting content objects...')

let CONTENT = {}, ADV_CONTENT = {}, FINAL_CONTENT = {}

try {
  const contentSrc = extractContentObj(mainJs, 'CONTENT')
  eval(`CONTENT = ${contentSrc}`)
  console.log(`✓ CONTENT: ${Object.keys(CONTENT).length} entries`)
} catch(e) { console.error('CONTENT extract failed:', e.message) }

try {
  const advSrc = extractContentObj(mainJs, 'ADV_CONTENT')
  eval(`ADV_CONTENT = ${advSrc}`)
  console.log(`✓ ADV_CONTENT: ${Object.keys(ADV_CONTENT).length} entries`)
} catch(e) { console.error('ADV_CONTENT extract failed:', e.message) }

try {
  const finalSrc = extractContentObj(mainJs, 'FINAL_CONTENT')
  eval(`FINAL_CONTENT = ${finalSrc}`)
  console.log(`✓ FINAL_CONTENT: ${Object.keys(FINAL_CONTENT).length} entries`)
} catch(e) { console.error('FINAL_CONTENT extract failed:', e.message) }

// ── Extract course arrays ─────────────────────────────────────
let courseData = [], advancedCourseData = [], finalCourseData = []

try {
  let src = extractObject(mainJs, 'courseData')
  // Replace CONTENT.xxx references with actual values
  src = src.replace(/CONTENT\.(\w+)/g, (_, key) => {
    const val = CONTENT[key]
    return val ? JSON.stringify(val) : '""'
  })
  eval(`courseData = ${src}`)
  console.log(`✓ courseData: ${courseData.length} chapters`)
} catch(e) { console.error('courseData extract failed:', e.message) }

try {
  let src = extractObject(mainJs, 'advancedCourseData')
  src = src.replace(/ADV_CONTENT\.(\w+)/g, (_, key) => {
    const val = ADV_CONTENT[key]
    return val ? JSON.stringify(val) : '""'
  })
  eval(`advancedCourseData = ${src}`)
  console.log(`✓ advancedCourseData: ${advancedCourseData.length} chapters`)
} catch(e) { console.error('advancedCourseData extract failed:', e.message) }

try {
  let src = extractObject(mainJs, 'finalCourseData')
  src = src.replace(/FINAL_CONTENT\.(\w+)/g, (_, key) => {
    const val = FINAL_CONTENT[key]
    return val ? JSON.stringify(val) : '""'
  })
  eval(`finalCourseData = ${src}`)
  console.log(`✓ finalCourseData: ${finalCourseData.length} chapters`)
} catch(e) { console.error('finalCourseData extract failed:', e.message) }

// ── Seed database ─────────────────────────────────────────────
async function seedCourse(courseId, courseTitle, chapters, parentId) {
  console.log(`\nSeeding course: ${courseId} (${chapters.length} chapters)`)

  await prisma.course.upsert({
    where: { id: courseId },
    update: { title: courseTitle, parentId: parentId || null },
    create: { id: courseId, title: courseTitle, order: courseId === 'basic' ? 0 : courseId === 'advanced' ? 1 : 2, parentId: parentId || null }
  })

  let totalSteps = 0

  for (let ci = 0; ci < chapters.length; ci++) {
    const ch = chapters[ci]
    await prisma.chapter.upsert({
      where: { id: ch.id },
      update: { title: ch.title, order: ci },
      create: { id: ch.id, courseId, title: ch.title, order: ci }
    })

    for (let li = 0; li < (ch.lessons || []).length; li++) {
      const lesson = ch.lessons[li]
      await prisma.lesson.upsert({
        where: { id: lesson.id },
        update: { title: lesson.title, order: li },
        create: { id: lesson.id, chapterId: ch.id, title: lesson.title, order: li }
      })

      // Delete existing steps for clean re-seed
      await prisma.step.deleteMany({ where: { lessonId: lesson.id } })

      for (let si = 0; si < (lesson.steps || []).length; si++) {
        const step = lesson.steps[si]
        await prisma.step.create({
          data: {
            lessonId:      lesson.id,
            order:         si,
            type:          step.type || 'theory',
            title:         step.title || '',
            content:       step.content || null,
            question:      step.question || null,
            instruction:   step.instruction || null,
            options:       step.options ? JSON.stringify(step.options) : null,
            correctAnswers: step.correctAnswers ? JSON.stringify(step.correctAnswers) : null,
            multiple:      step.multiple || false,
            explanation:   step.explanation || null,
            points:        step.points || 1,
            statsSolved:   step.stats?.solved || 0,
            statsAccuracy: step.stats?.accuracy || 0,
            practiceType:  step.practiceType || null,
            description:   step.description || null,
            taskId:        step.taskId        || null,
          }
        })
        totalSteps++
      }
    }
  }

  console.log(`  ✓ ${chapters.length} chapters, ${totalSteps} steps seeded`)
}

async function main() {
  console.log('\n🌱 Starting seed...\n')

  // Create the "Тестирование ПО" parent course
  await prisma.course.upsert({
    where: { id: 'testing' },
    update: { title: 'Тестирование ПО' },
    create: { id: 'testing', title: 'Тестирование ПО', description: 'Основы тестирования, инструменты и автоматизация', icon: '💻', order: -1 }
  })
  console.log('✓ Parent course: testing (Тестирование ПО)')

  if (courseData.length > 0)
    await seedCourse('basic', 'Основной курс', courseData, 'testing')
  
  if (advancedCourseData.length > 0)
    await seedCourse('advanced', 'Продвинутый курс', advancedCourseData, 'testing')
  
  if (finalCourseData.length > 0)
    await seedCourse('final', 'Финальный курс', finalCourseData, 'testing')

  console.log('\n✅ Seed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
