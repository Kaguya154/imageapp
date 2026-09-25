function fmtTime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function HistoryList({ items, onUse, onDelete, onView }) {
  if (!items.length) {
    return <p className="hint">暂无历史记录。生成结果会自动保存在本地浏览器中。</p>
  }
  return (
    <div className="history">
      {items.map((it) => (
        <div key={it.id} className="history-item">
          <div className="history-thumbs">
            {it.images.slice(0, 3).map((im, i) => (
              <img key={i} src={im} alt="" loading="lazy" onClick={() => onView(im)} />
            ))}
          </div>
          <div className="history-meta">
            <div className="line1">
              <b>{it.modelName}</b>
              <span className="tag">{it.mode === 'edit' ? '编辑' : '生成'}</span>
              <time>{fmtTime(it.ts)}</time>
            </div>
            <p className="prompt" title={it.prompt}>{it.prompt}</p>
            <div className="history-actions">
              <button className="btn small ghost" onClick={() => onUse(it)}>复用提示词</button>
              <button className="btn small ghost danger-text" onClick={() => onDelete(it.id)}>删除</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
