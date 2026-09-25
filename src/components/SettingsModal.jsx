import { useState } from 'react'
import { DEFAULT_BASE_URL } from '../lib/models'

export default function SettingsModal({ settings, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(settings.apiKey || '')
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || '')
  const [show, setShow] = useState(false)

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="设置" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>设置</h2>
          <button className="btn ghost small" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <label className="field">
          <span className="label">API Key（必填）</span>
          <div className="key-row">
            <input
              type={show ? 'text' : 'password'}
              value={apiKey}
              placeholder="在 Modelink 控制台创建的密钥"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setApiKey(e.target.value.trim())}
            />
            <button className="btn small" onClick={() => setShow((v) => !v)}>
              {show ? '隐藏' : '显示'}
            </button>
          </div>
          <span className="hint">
            仅保存在此浏览器的 localStorage 中，请求直接从你的浏览器发往 API，不经过任何中间服务器。
            <a href="https://modelink.ai/" target="_blank" rel="noreferrer">前往控制台获取 →</a>
          </span>
        </label>

        <label className="field">
          <span className="label">API 地址（可选）</span>
          <input
            type="text"
            value={baseUrl}
            placeholder={DEFAULT_BASE_URL}
            spellCheck={false}
            onChange={(e) => setBaseUrl(e.target.value.trim())}
          />
          <span className="hint">
            默认 {DEFAULT_BASE_URL}。如遇浏览器 CORS 限制或需要自建反向代理，可改为代理地址（无需包含 /v1 后缀）。
          </span>
        </label>

        <div className="actions right">
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={() => onSave({ apiKey, baseUrl })}>保存</button>
        </div>
      </div>
    </div>
  )
}
