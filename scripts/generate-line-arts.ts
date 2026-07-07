/**
 * 小云雀食材线稿批量生成脚本
 * 检查缺少线稿的食材，调用小云雀 API 生成
 *
 * 用法: npx tsx scripts/generate-line-arts.ts
 */

const XYQ_BASE = process.env.XYQ_BASE_URL || 'https://xyq.jianying.com'
const XYQ_KEY = process.env.XYQ_ACCESS_KEY || ''

async function submitRun(message: string) {
  const resp = await fetch(`${XYQ_BASE}/api/biz/v1/skill/submit_run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${XYQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })
  return resp.json()
}

async function getThread(threadId: string, runId: string, afterSeq = 0) {
  const resp = await fetch(`${XYQ_BASE}/api/biz/v1/skill/get_thread`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${XYQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ thread_id: threadId, run_id: runId, after_seq: afterSeq }),
  })
  return resp.json()
}

async function downloadFile(url: string, outputPath: string) {
  const resp = await fetch(url)
  const buffer = Buffer.from(await resp.arrayBuffer())
  fs.writeFileSync(outputPath, buffer)
}

import * as fs from 'fs'
import * as path from 'path'

const LINE_ARTS_DIR = path.resolve(process.cwd(), 'public/line-arts')
const INGREDIENTS_FILE = path.resolve(process.cwd(), 'app/data/ingredients.json')

async function main() {
  if (!XYQ_KEY) {
    console.log('❌ XYQ_ACCESS_KEY not set in .env')
    return
  }

  // Load ingredients
  const ingredients = JSON.parse(fs.readFileSync(INGREDIENTS_FILE, 'utf-8'))

  // Check which ingredients don't have line art
  const existing = new Set(
    fs.readdirSync(LINE_ARTS_DIR)
      .filter(f => f.endsWith('.svg'))
      .map(f => f.replace('.svg', ''))
  )

  const missing = ingredients.filter((i: any) => !existing.has(i.name))
  console.log(`📊 ${ingredients.length} ingredients, ${existing.size} have line art, ${missing.length} missing`)

  if (missing.length === 0) {
    console.log('✅ All ingredients have line art!')
    return
  }

  // Generate for missing ingredients (limit to 5 per run to avoid rate limits)
  const toGenerate = missing.slice(0, 5)
  console.log(`\n🎨 Generating line art for: ${toGenerate.map((i: any) => i.name).join(', ')}`)

  for (const ingredient of toGenerate) {
    console.log(`\n  ⏳ Generating: ${ingredient.name}...`)

    try {
      const result = await submitRun(
        `彩铅手绘风格的${ingredient.name}，彩色素描，没有填色只有彩色线条的，大面积留白的，写实且潦草的笔触，纯白色背景。模型：Seedream 5.0 Lite，尺寸：2K，比例：1:1`
      )

      const threadId = result.data?.run?.thread_id
      const runId = result.data?.run?.run_id
      const webLink = result.data?.web_thread_link

      if (!threadId || !runId) {
        console.log(`  ❌ Failed to submit for ${ingredient.name}`)
        continue
      }

      console.log(`  🔗 ${webLink}`)

      // Poll for result
      let afterSeq = 0
      let attempts = 0
      const maxAttempts = 12 // 2 minutes max

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 10000))
        attempts++

        const threadData = await getThread(threadId, runId, afterSeq)
        const thread = threadData.data?.thread
        if (!thread?.run_list?.length) continue

        const run = thread.run_list[0]
        if (run.state === 3) {
          // Success - extract URL
          const entries = run.entry_list || []
          for (const entry of entries) {
            const artifact = entry.artifact
            if (artifact?.content) {
              for (const c of artifact.content) {
                if (c.data?.url) {
                  const outputPath = path.join(LINE_ARTS_DIR, `${ingredient.name}.svg`)
                  await downloadFile(c.data.url, outputPath)
                  console.log(`  ✅ Saved: ${ingredient.name}.svg`)
                  break
                }
              }
            }
          }
          break
        }

        if (run.state === 4 || run.state === 5) {
          console.log(`  ❌ Failed: ${run.fail_reason || 'Unknown error'}`)
          break
        }

        afterSeq = thread.run_list.length
      }

      if (attempts >= maxAttempts) {
        console.log(`  ⏰ Timeout for ${ingredient.name}`)
      }
    } catch (e: any) {
      console.log(`  ❌ Error: ${e.message}`)
    }
  }

  console.log('\n✨ Done!')
}

main().catch(console.error)
