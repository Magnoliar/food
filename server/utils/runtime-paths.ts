import path from 'node:path'

function resolveRuntimePath(envName: string, fallback: string) {
  const configured = process.env[envName]?.trim()
  return path.resolve(process.cwd(), configured || fallback)
}

export function getRuntimePaths() {
  return {
    publicUploadsDir: resolveRuntimePath('APP_UPLOADS_PATH', 'public/uploads'),
    uploadsBackupDir: resolveRuntimePath('APP_UPLOADS_BACKUP_PATH', 'uploads_backup'),
    lineArtsDir: resolveRuntimePath('APP_LINE_ARTS_PATH', 'public/line-arts'),
    settingsFile: resolveRuntimePath('APP_SETTINGS_PATH', 'server/data/settings.json'),
    lineArtHistoryFile: resolveRuntimePath('APP_LINE_ART_HISTORY_PATH', 'server/data/line-art-history.json'),
  }
}

export function isPathInside(root: string, candidate: string) {
  const resolvedRoot = path.resolve(root)
  const resolvedCandidate = path.resolve(candidate)
  const relative = path.relative(resolvedRoot, resolvedCandidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}
