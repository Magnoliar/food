import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { getRuntimePaths } from './runtime-paths'

export interface AppSettings {
  ai: {
    baseUrl1: string
    apiKey1: string
    model1: string
    modelLight1: string
    baseUrl2: string
    apiKey2: string
    model2: string
    modelLight2: string
    baseUrl3: string
    apiKey3: string
    model3: string
    modelLight3: string
  }
  xyq: {
    accessKey: string
    baseUrl: string
  }
}

const defaults: AppSettings = {
  ai: {
    baseUrl1: '', apiKey1: '', model1: '', modelLight1: '',
    baseUrl2: '', apiKey2: '', model2: '', modelLight2: '',
    baseUrl3: '', apiKey3: '', model3: '', modelLight3: '',
  },
  xyq: { accessKey: '', baseUrl: '' },
}

export function loadSettings(): AppSettings {
  try {
    const settingsPath = getRuntimePaths().settingsFile
    if (existsSync(settingsPath)) {
      return JSON.parse(readFileSync(settingsPath, 'utf-8'))
    }
  } catch {}
  return JSON.parse(JSON.stringify(defaults))
}

export function saveSettings(settings: AppSettings) {
  const settingsPath = getRuntimePaths().settingsFile
  const temporaryPath = `${settingsPath}.tmp`
  mkdirSync(path.dirname(settingsPath), { recursive: true })
  try {
    writeFileSync(temporaryPath, JSON.stringify(settings, null, 2), { encoding: 'utf8', mode: 0o600 })
    renameSync(temporaryPath, settingsPath)
  } finally {
    rmSync(temporaryPath, { force: true })
  }
}

// Get effective config: file overrides > env defaults
export function getEffectiveAIConfig() {
  const config = useRuntimeConfig()
  const file = loadSettings()

  return {
    baseUrl1: file.ai.baseUrl1 || config.aiBaseUrl1 || '',
    apiKey1: file.ai.apiKey1 || config.aiApiKey1 || '',
    model1: file.ai.model1 || config.aiModel1 || 'gpt-4o',
    modelLight1: file.ai.modelLight1 || config.aiModelLight1 || 'gpt-4o-mini',
    baseUrl2: file.ai.baseUrl2 || config.aiBaseUrl2 || '',
    apiKey2: file.ai.apiKey2 || config.aiApiKey2 || '',
    model2: file.ai.model2 || config.aiModel2 || '',
    modelLight2: file.ai.modelLight2 || config.aiModelLight2 || '',
    baseUrl3: file.ai.baseUrl3 || config.aiBaseUrl3 || '',
    apiKey3: file.ai.apiKey3 || config.aiApiKey3 || '',
    model3: file.ai.model3 || config.aiModel3 || '',
    modelLight3: file.ai.modelLight3 || config.aiModelLight3 || '',
    xyqAccessKey: file.xyq.accessKey || config.xyqAccessKey || '',
    xyqBaseUrl: file.xyq.baseUrl || config.xyqBaseUrl || 'https://xyq.jianying.com',
  }
}
