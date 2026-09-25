const PREFIX = 'mis.'
const KEYS = {
  settings: PREFIX + 'settings',
  params: PREFIX + 'params',
  history: PREFIX + 'history',
  drafts: PREFIX + 'drafts',
}

export const HISTORY_LIMIT = 24

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadSettings() {
  return read(KEYS.settings, { apiKey: '', baseUrl: '' })
}

export function saveSettings(s) {
  return write(KEYS.settings, s)
}

export function loadAllParams() {
  return read(KEYS.params, {})
}

export function saveParams(modelId, params) {
  const all = loadAllParams()
  all[modelId] = params
  return write(KEYS.params, all)
}

export function loadDrafts() {
  return read(KEYS.drafts, {})
}

export function saveDrafts(d) {
  return write(KEYS.drafts, d)
}

export function loadHistory() {
  return read(KEYS.history, [])
}

export function saveHistoryEntry(entry) {
  let list = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT)
  while (list.length && !write(KEYS.history, list)) {
    // 配额不足：从末尾删除较旧记录重试
    list = list.slice(0, Math.max(1, Math.floor(list.length / 2)))
    if (list.length === 1 && !write(KEYS.history, list)) break
  }
  return list
}

export function deleteHistoryEntry(id) {
  const list = loadHistory().filter((e) => e.id !== id)
  write(KEYS.history, list)
  return list
}

export function clearHistory() {
  write(KEYS.history, [])
}

/** 将过大的 dataURL 压缩为 JPEG（用于历史记录存储），失败时原样返回 */
export function shrinkDataUrl(dataUrl, maxDim = 1536, quality = 0.85) {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith('data:image')) return resolve(dataUrl)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      if (scale >= 1 && dataUrl.length < 1_500_000) return resolve(dataUrl)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/** 读取本地文件为 dataURL */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}
