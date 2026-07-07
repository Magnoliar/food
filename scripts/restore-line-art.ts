import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { readdirSync } from 'fs'
import { join } from 'path'

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
  const prisma = new PrismaClient({ adapter })

  const dir = join(process.cwd(), 'public', 'line-arts')
  const files = readdirSync(dir).filter(f => f.endsWith('.jpg'))

  const groups: Record<string, string[]> = {}
  for (const f of files) {
    const name = f.replace(/_[0-9]+\.jpg$/, '')
    if (!groups[name]) groups[name] = []
    groups[name].push('/line-arts/' + f)
  }

  console.log(`Found ${Object.keys(groups).length} ingredients with images`)

  let updated = 0
  let skipped = 0
  for (const [name, urls] of Object.entries(groups)) {
    const ing = await prisma.ingredient.findFirst({ where: { name } })
    if (ing) {
      await prisma.ingredient.update({
        where: { id: ing.id },
        data: { lineArtUrl: JSON.stringify(urls) },
      })
      updated++
      console.log(`  ✓ ${name} → ${urls.length} images`)
    } else {
      skipped++
      console.log(`  ✗ ${name} → not in DB`)
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped`)

  // Also write history file
  const history: any[] = []
  for (const [name, urls] of Object.entries(groups)) {
    const ing = await prisma.ingredient.findFirst({ where: { name } })
    history.push({
      ingredientName: name,
      ingredientId: ing?.id || null,
      imageUrls: urls,
      timestamp: new Date().toISOString(),
    })
  }
  const { writeFileSync } = await import('fs')
  writeFileSync(join(process.cwd(), 'server/data/line-art-history.json'), JSON.stringify(history, null, 2))
  console.log(`History file written with ${history.length} entries`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
