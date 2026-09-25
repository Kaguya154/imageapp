import { useRef, useState } from 'react'

export default function ImageDropzone({ images, max, optional, onAdd, onRemove }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="field">
      <span className="label">
        参考图{optional ? '（可选，随提示词一并发送）' : `（必填，最多 ${max} 张）`}
      </span>
      <div
        className={`dropzone ${dragOver ? 'over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          onAdd([...e.dataTransfer.files])
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onAdd([...e.target.files])
            e.target.value = ''
          }}
        />
        {images.length === 0 ? (
          <span className="hint">点击选择、拖拽或粘贴图片（Ctrl+V）</span>
        ) : (
          <div className="thumbs" onClick={(e) => e.stopPropagation()}>
            {images.map((im) => (
              <div key={im.id} className="thumb">
                <img src={im.dataUrl} alt={im.name} />
                <button
                  className="remove"
                  aria-label="移除"
                  onClick={() => onRemove(im.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            {images.length < max && (
              <button className="thumb add" onClick={() => inputRef.current?.click()}>
                +
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
