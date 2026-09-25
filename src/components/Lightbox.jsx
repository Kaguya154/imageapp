import { useEffect } from 'react'

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-mask lightbox" onClick={onClose}>
      <img src={src} alt="预览" onClick={(e) => e.stopPropagation()} />
      <button className="btn small lightbox-close" onClick={onClose} aria-label="关闭">✕</button>
    </div>
  )
}
