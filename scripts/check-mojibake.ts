import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGETS = ['app', 'server', 'scripts', 'prisma', 'public', 'docs', 'README.md', 'CLAUDE.md', 'CODE_REVIEW_DISCOVERY.md']
const SKIP = new Set(['node_modules', '.nuxt', '.output', 'app/generated', 'docs/archive', 'docs/source'])
const PATTERN = /[鍛鑿鐑璇鐢绛閿楠鏂杩宸熸愬惧氨]/u

function walk(target: string, files: string[] = []) {
  const full = path.resolve(ROOT, target)
  const stat = statSync(full, { throwIfNoEntry: false })
  if (!stat) return files
  const relative = path.relative(ROOT, full).replace(/\\/g, '/')
  if ([...SKIP].some(skip => relative === skip || relative.startsWith(`${skip}/`))) return files
  if (stat.isDirectory()) {
    for (const child of readdirSync(full)) walk(path.join(target, child), files)
  } else if (/\.(ts|vue|json|md|prisma|yml|yaml|html|webmanifest|js)$/.test(full)) {
    files.push(full)
  }
  return files
}

const hits: string[] = []
for (const target of TARGETS) {
  for (const file of walk(target)) {
    if (file.endsWith(path.join('scripts', 'check-mojibake.ts'))) continue
    const text = readFileSync(file, 'utf8')
    const lines = text.split(/\r?\n/)
    lines.forEach((line, index) => {
      if (PATTERN.test(line)) hits.push(`${path.relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 120)}`)
    })
  }
}

if (hits.length) {
  console.error(`发现疑似中文乱码 ${hits.length} 处：`)
  console.error(hits.slice(0, 80).join('\n'))
  process.exit(1)
}

console.log('未发现疑似中文乱码')
