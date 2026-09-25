import { useEffect, useMemo, useRef, useState } from 'react'
import { MODELS, getModel, protocolLabel, DEFAULT_BASE_URL } from './lib/models'
import { generate, ApiError } from './lib/api'
import {
  loadSettings, saveSettings,
  loadAllParams, saveParams,
  loadDrafts, saveDrafts,
  loadHistory, saveHistoryEntry, deleteHistoryEntry, clearHistory,
  shrinkDataUrl, fileToDataUrl, HISTORY_LIMIT,
} from './lib/storage'
import SettingsModal from './components/SettingsModal'
import ParamControls from './components/ParamControls'
import ImageDropzone from './components/ImageDropzone'
import HistoryList from './components/HistoryList'
import Lightbox from './components/Lightbox'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** 按协议把通用参数整理为接口实际需要的字段 */
function buildParams(modelDef, protocol, p) {
  const k = modelDef.kinds[protocol] || {}
  const out = {}
  const not = (v, ...vals) => v != null && !vals.includes(v)
  if (protocol === 'openai-images') {
    if (not(p.size, '', 'auto')) out.size = p.size
    if (not(p.quality, '', 'auto')) out.quality = p.quality
    if (p.num_images > 1) out.n = p.num_images
    if (not(p.output_format, '', 'png')) out.output_format = p.output_format
  } else if (protocol === 'chat') {
    if (not(p.aspect_ratio, '', 'auto')) out.aspect_ratio = p.aspect_ratio
    if (not(p.resolution, '', 'auto') && k.resolutions) out.resolution = p.resolution
  } else if (protocol === 'fal') {
    if (modelDef.provider === 'OpenAI') {
      if (not(p.image_size, '', 'auto')) out.image_size = p.image_size
      if (not(p.quality, '', 'auto')) out.quality = p.quality
      if (p.num_images > 1) out.num_images = p.num_images
      if (not(p.output_format, '', 'png')) out.output_format = p.output_format
    } else if (modelDef.provider === 'Google') {
      if (not(p.aspect_ratio, '', 'auto')) out.aspect_ratio = p.aspect_ratio
      if (not(p.resolution, '', 'auto') && k.resolutions) out.resolution = p.resolution
      if (k.thinking && not(p.thinking_level, '', 'none')) out.thinking_level = p.thinking_level
    } else if (modelDef.provider === 'Kling') {
      if (not(p.resolution, '', 'auto')) out.resolution = p.resolution
      if (p.num_images > 1) out.num_images = Math.min(p.num_images, k.maxN || 9)
    }
  }
  return out
}

export default function App() {
  const [settings, setSettings] = useState(() => loadSettings())
  const [showSettings, setShowSettings] = useState(false)
  const [history, setHistory] = useState(() => loadHistory())
  const [allParams, setAllParams] = useState(() => loadAllParams())
  const drafts = useRef(loadDrafts())

  const [modelId, setModelId] = useState(drafts.current.modelId || MODELS[0].id)
  const modelDef = getModel(modelId)
  const [protocol, setProtocol] = useState(drafts.current.protocol || modelDef.defaultProtocol)
  const [mode, setMode] = useState(drafts.current.mode || 'generate')
  const [prompt, setPrompt] = useState(drafts.current.prompt || '')

  const [refImages, setRefImages] = useState([]) // [{id,name,dataUrl}]
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const abortRef = useRef(null)

  // 切换模型时修正协议默认值
  useEffect(() => {
    if (!modelDef.protocols.includes(protocol)) {
      setProtocol(modelDef.defaultProtocol)
    }
  }, [modelId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 草稿持久化
  useEffect(() => {
    saveDrafts({ modelId, protocol, mode, prompt })
  }, [modelId, protocol, mode, prompt])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const params = allParams[`${modelId}::${protocol}`] || {}
  const setParam = (key, value) => {
    const key2 = `${modelId}::${protocol}`
    setAllParams((prev) => {
      const next = { ...prev, [key2]: { ...prev[key2], [key]: value } }
      saveParams(modelId + '::' + protocol, next[key2])
      return next
    })
  }

  const kind = modelDef.kinds[protocol] || {}
  const promptMax = kind.promptMax
  const effectiveMode = mode === 'edit' ? 'edit' : 'generate'
  const needsRefImages = effectiveMode === 'edit'

  async function addFiles(files) {
    const max = kind.maxRefs || 8
    const list = [...refImages]
    for (const f of files) {
      if (list.length >= max) break
      if (!f.type.startsWith('image/')) continue
      const dataUrl = await fileToDataUrl(f)
      list.push({ id: uid(), name: f.name || 'image', dataUrl })
    }
    setRefImages(list)
  }

  useEffect(() => {
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files || [])]
      if (files.length && (needsRefImages || effectiveMode === 'generate')) {
        addFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    if (busy) return
    if (!settings.apiKey) {
      setShowSettings(true)
      setError('请先在设置中填写 API Key')
      return
    }
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }
    if (needsRefImages && refImages.length === 0) {
      setError('编辑模式需要至少上传一张参考图')
      return
    }
    setError('')
    setBusy(true)
    setResults([])
    setStatusText(protocol === 'fal' ? '任务提交中…' : '生成中，请稍候…')

    const controller = new AbortController()
    abortRef.current = controller
    try {
      const payloadParams = buildParams(modelDef, protocol, params)
      const images = await generate({
        protocol,
        settings,
        apiKey: settings.apiKey,
        modelDef,
        model: modelDef.id,
        prompt: prompt.trim(),
        params: payloadParams,
        refImages: needsRefImages ? refImages : [],
        signal: controller.signal,
        onStatus: setStatusText,
      })
      setResults(images)
      persistHistory(images, payloadParams)
    } catch (e) {
      if (e.name === 'AbortError') {
        setStatusText('')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError(e.message || '发生未知错误')
      }
    } finally {
      setBusy(false)
      setStatusText('')
      abortRef.current = null
    }
  }

  async function persistHistory(images, payloadParams) {
    const stored = await Promise.all(images.map((im) => shrinkDataUrl(im)))
    const entry = {
      id: uid(),
      ts: Date.now(),
      modelId,
      modelName: modelDef.name,
      provider: modelDef.provider,
      protocol,
      mode: effectiveMode,
      prompt: prompt.trim(),
      params: payloadParams,
      images: stored,
    }
    setHistory(saveHistoryEntry(entry))
  }

  function useAsReference(dataUrl) {
    const max = kind.maxRefs || 8
    setRefImages((prev) => (prev.length >= max ? prev : [...prev, { id: uid(), name: 'result', dataUrl }]))
    setMode('edit')
  }

  async function download(dataUrl, index) {
    try {
      let href = dataUrl
      if (!dataUrl.startsWith('data:')) {
        const blob = await (await fetch(dataUrl)).blob()
        href = URL.createObjectURL(blob)
      }
      const ext = (dataUrl.match(/data:image\/(\w+)/) || [])[1] || 'png'
      const a = document.createElement('a')
      a.href = href
      a.download = `${modelDef.name}-${Date.now()}-${index}.${ext}`
      a.click()
      if (href.startsWith('blob:')) URL.revokeObjectURL(href)
    } catch {
      window.open(dataUrl, '_blank')
    }
  }

  const hasKey = Boolean(settings.apiKey)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          <div>
            <h1>Modelink Image Studio</h1>
            <p className="sub">AI 图片生成与编辑 · 纯前端 · 密钥仅存本地</p>
          </div>
        </div>
        <div className="header-actions">
          <a className="btn ghost" href="https://docs.modelink.ai/" target="_blank" rel="noreferrer">
            API 文档
          </a>
          <button className="btn" onClick={() => setShowSettings(true)}>
            <span className={`dot ${hasKey ? 'ok' : 'bad'}`} />
            {hasKey ? '已配置密钥' : '配置 API Key'}
          </button>
        </div>
      </header>

      <main className="main">
        <section className="panel controls">
          <div className="tabs" role="tablist">
            {['generate', 'edit'].map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                className={mode === m ? 'active' : ''}
                onClick={() => setMode(m)}
              >
                {m === 'generate' ? '文生图' : '图片编辑'}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="label">模型</span>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {['OpenAI', 'Google', 'Kling'].map((prov) => (
                <optgroup key={prov} label={prov}>
                  {MODELS.filter((m) => m.provider === prov).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="hint">{modelDef.note}</p>

          {modelDef.protocols.length > 1 && (
            <div className="seg" role="tablist" aria-label="接口协议">
              {modelDef.protocols.map((p) => (
                <button key={p} className={protocol === p ? 'active' : ''} onClick={() => setProtocol(p)}>
                  {protocolLabel(p)}
                </button>
              ))}
            </div>
          )}

          <label className="field">
            <span className="label">
              提示词
              {promptMax && (
                <em className={prompt.length > promptMax ? 'over' : ''}>
                  {prompt.length}/{promptMax}
                </em>
              )}
            </span>
            <textarea
              rows={5}
              value={prompt}
              maxLength={promptMax || 32000}
              placeholder={
                effectiveMode === 'edit'
                  ? '描述要如何修改参考图，例如：把背景换成雪山日落，保持人物不变'
                  : '描述你想生成的图片，例如：一只橘猫坐在窗边，电影感光影，胶片质感'
              }
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>

          {(needsRefImages || protocol === 'openai-images' || protocol === 'chat') && (
            <ImageDropzone
              images={refImages}
              max={kind.maxRefs || 8}
              optional={!needsRefImages}
              onAdd={addFiles}
              onRemove={(id) => setRefImages((prev) => prev.filter((i) => i.id !== id))}
            />
          )}

          <ParamControls kind={kind} protocol={protocol} params={params} onChange={setParam} />

          <div className="actions">
            <button className="btn primary big" onClick={handleGenerate} disabled={busy}>
              {busy ? '生成中…' : effectiveMode === 'edit' ? '开始编辑' : '开始生成'}
            </button>
            {busy && (
              <button className="btn danger" onClick={() => abortRef.current?.abort()}>
                取消
              </button>
            )}
          </div>

          {statusText && <p className="status">{statusText}</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </section>

        <section className="panel results">
          <h2>本次结果</h2>
          {results.length === 0 && !busy && (
            <div className="empty">
              <p>结果会显示在这里</p>
              <p className="hint">提示：图片仅保存在你的浏览器（localStorage），不会上传到任何服务器</p>
            </div>
          )}
          {busy && <div className="spinner" aria-label="加载中" />}
          <div className="grid">
            {results.map((im, i) => (
              <figure key={i} className="card">
                <img src={im} alt={`结果 ${i + 1}`} loading="lazy" onClick={() => setLightbox(im)} />
                <figcaption>
                  <button className="btn small" onClick={() => download(im, i)}>下载</button>
                  <button className="btn small" onClick={() => useAsReference(im)}>用作参考图</button>
                  <button className="btn small" onClick={() => setLightbox(im)}>查看</button>
                </figcaption>
              </figure>
            ))}
          </div>

          <h2>
            历史记录
            <span className="count">{history.length}/{HISTORY_LIMIT}</span>
            {history.length > 0 && (
              <button className="btn small ghost" onClick={() => setHistory(clearHistory())}>
                清空
              </button>
            )}
          </h2>
          <HistoryList
            items={history}
            onUse={(entry) => {
              setModelId(entry.modelId)
              setPrompt(entry.prompt)
              if (entry.mode === 'edit') {
                setMode('edit')
                setRefImages([])
              } else {
                setMode('generate')
              }
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onDelete={(id) => setHistory(deleteHistoryEntry(id))}
            onView={setLightbox}
          />
        </section>
      </main>

      <footer className="footer">
        基于 Modelink API 构建 · 默认接口地址 {DEFAULT_BASE_URL} · 本项目不收集任何数据
      </footer>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={(s) => {
            setSettings(s)
            setShowSettings(false)
            setError('')
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}
