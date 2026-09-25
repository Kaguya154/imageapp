import { DEFAULT_BASE_URL } from './models'

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

function baseUrlOf(settings) {
  return (settings.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

async function readError(res) {
  let body = null
  try {
    body = await res.json()
  } catch {
    /* ignore */
  }
  const msg =
    body?.error?.message ||
    (typeof body?.detail === 'object' ? body?.detail?.msg : body?.detail) ||
    body?.message ||
    `请求失败 (HTTP ${res.status})`
  return new ApiError(msg, res.status, body)
}

async function postJson(url, apiKey, body, signal) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ApiError('网络请求失败：可能是浏览器 CORS 限制或网络不可达。可在设置中尝试更换 API 地址（反向代理）。', 0)
  }
  if (!res.ok) throw await readError(res)
  return res.json()
}

function toDataUrl(raw, format) {
  if (!raw) return raw
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw
  return `data:image/${format || 'png'};base64,${raw}`
}

function pickImagesFromOpenAIResponse(data, format) {
  return (data?.data || [])
    .map((d) => toDataUrl(d.b64_json || d.url, format))
    .filter(Boolean)
}

/* ---------------- OpenAI Images 协议（同步） ---------------- */

export async function generateWithOpenAIImages({ settings, apiKey, model, prompt, params, refImages, signal }) {
  const base = baseUrlOf(settings)
  const payload = { model, prompt, ...params }
  let url = `${base}/v1/images/generations`
  if (refImages.length > 0) {
    url = `${base}/v1/images/edits`
    payload.image = refImages.map((r) => r.dataUrl)
    delete payload.image_size
  }
  const format = payload.output_format || 'png'
  const data = await postJson(url, apiKey, payload, signal)
  const images = pickImagesFromOpenAIResponse(data, format)
  if (!images.length) throw new ApiError('接口未返回图片', 200, data)
  return images
}

/* ---------------- Chat Completions 协议（Gemini, 同步） ---------------- */

export async function generateWithChat({ settings, apiKey, model, prompt, params, refImages, signal }) {
  const base = baseUrlOf(settings)
  const content = [{ type: 'text', text: prompt }]
  for (const r of refImages) content.push({ type: 'image_url', image_url: { url: r.dataUrl } })

  const imageConfig = {}
  if (params.aspect_ratio && params.aspect_ratio !== 'auto') imageConfig.aspect_ratio = params.aspect_ratio
  if (params.resolution) imageConfig.image_size = params.resolution

  const payload = {
    model,
    messages: [{ role: 'user', content }],
    modalities: ['image', 'text'],
  }
  if (Object.keys(imageConfig).length) payload.image_config = imageConfig

  const data = await postJson(`${base}/v1/chat/completions`, apiKey, payload, signal)
  const msg = data?.choices?.[0]?.message
  const images = (msg?.images || [])
    .map((im) => im?.image_url?.url)
    .filter(Boolean)
  if (!images.length) {
    const text = typeof msg?.content === 'string' ? msg.content.trim() : ''
    throw new ApiError(text ? `模型未返回图片，回复内容：${text.slice(0, 200)}` : '接口未返回图片', 200, data)
  }
  return images
}

/* ---------------- FAL 队列协议（异步轮询） ---------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function generateWithFal({ settings, apiKey, modelDef, prompt, params, refImages, signal, onStatus }) {
  const base = baseUrlOf(settings)
  const kind = modelDef.kinds.fal
  const isEdit = refImages.length > 0

  let submitPath = isEdit ? modelDef.fal.edit : modelDef.fal.submit
  // Kling 的编辑与生成共用同一提交端点
  if (modelDef.id === 'kling-image-o1') submitPath = modelDef.fal.submit

  const body = { prompt }
  if (params.image_size && params.image_size !== 'auto') body.image_size = params.image_size
  if (params.size && params.size !== 'auto') body.image_size = params.size
  if (params.quality && params.quality !== 'auto') body.quality = params.quality
  if (params.num_images > 1) body.num_images = params.num_images
  if (params.output_format) body.output_format = params.output_format
  if (params.aspect_ratio && params.aspect_ratio !== 'auto') body.aspect_ratio = params.aspect_ratio
  if (params.resolution) body.resolution = params.resolution
  if (params.thinking_level) body.thinking_level = params.thinking_level
  if (isEdit) {
    body.image_urls = refImages.map((r) => r.dataUrl)
    if (kind?.maxRefs && refImages.length > kind.maxRefs) {
      throw new ApiError(`该模型编辑模式最多支持 ${kind.maxRefs} 张参考图`, 400)
    }
  }

  onStatus?.('任务提交中…')
  const submitted = await postJson(`${base}${submitPath}`, apiKey, body, signal)
  const requestId = submitted.request_id
  if (!requestId) throw new ApiError('任务提交失败：未返回 request_id', 200, submitted)

  const statusUrl = `${base}${modelDef.fal.statusOf(requestId)}`
  const resultUrl = `${base}${modelDef.fal.resultOf(requestId)}`
  const started = Date.now()
  const TIMEOUT_MS = 15 * 60 * 1000
  let queuePosition = submitted.queue_position

  // 轮询：202 = 排队/进行中，200 = 完成
  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (Date.now() - started > TIMEOUT_MS) {
      throw new ApiError('任务超时：15 分钟内未完成，请稍后在结果页重试或更换模型。', 408)
    }
    await sleep(2000)
    const elapsed = Math.round((Date.now() - started) / 1000)
    onStatus?.(queuePosition ? `排队中（第 ${queuePosition} 位，已等待 ${elapsed}s）` : `生成中…（已等待 ${elapsed}s）`)

    let res
    try {
      res = await fetch(statusUrl, { headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` }, signal })
    } catch (e) {
      if (e.name === 'AbortError') throw e
      throw new ApiError('查询任务状态失败：网络请求异常（可能是 CORS 限制）。', 0)
    }
    if (res.status === 202) {
      const st = await res.json().catch(() => ({}))
      queuePosition = st.queue_position
      continue
    }
    if (!res.ok) throw await readError(res)

    const done = await res.json().catch(() => ({}))
    if (done.status === 'FAILED') {
      const errMsg = done?.error?.message || done?.detail?.msg || '任务执行失败'
      throw new ApiError(errMsg, 200, done)
    }
    if (done.status && done.status !== 'COMPLETED' && !done.result) continue

    // 拉取最终结果
    const result = done.result?.images ? done : await (async () => {
      const r2 = await fetch(resultUrl, { headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` }, signal })
      if (!r2.ok) throw await readError(r2)
      return r2.json()
    })()

    const urls = (result.images || result.result?.images || []).map((im) => im.url).filter(Boolean)
    if (!urls.length) throw new ApiError('任务完成但未返回图片', 200, result)

    onStatus?.('下载图片中…')
    const images = await Promise.all(urls.map((u) => fetchAsDataUrl(u, signal)))
    return images
  }
}

async function fetchAsDataUrl(url, signal) {
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return url
    const blob = await res.blob()
    if (blob.size > 8 * 1024 * 1024) return url // 过大则保留远端链接
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = () => resolve(url)
      fr.readAsDataURL(blob)
    })
  } catch {
    return url
  }
}

/* ---------------- 统一入口 ---------------- */

export function generate(opts) {
  const { protocol } = opts
  if (protocol === 'fal') return generateWithFal(opts)
  if (protocol === 'chat') return generateWithChat(opts)
  return generateWithOpenAIImages(opts)
}
