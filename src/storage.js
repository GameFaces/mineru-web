const SETTINGS_KEY = 'mineru_official_web_settings_v1'

export function loadSettings(defaults) {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return { ...defaults }
    return { ...defaults, ...JSON.parse(stored) }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
