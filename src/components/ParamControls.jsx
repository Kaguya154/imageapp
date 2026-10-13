export default function ParamControls({ kind, protocol, params, onChange }) {
  if (!kind || Object.keys(kind).length === 0) return null

  const aspects = kind.aspects
  const resolutions = kind.resolutions
  const qualities = kind.quality
  const sizes = kind.sizes
  const imageSizes = kind.imageSizes
  const maxN = kind.maxN || 1

  return (
    <div className="params">
      <span className="label">参数</span>

      {sizes && (
        <label className="field inline">
          <span>尺寸</span>
          <select
            value={params.size || kind.defaultSize || 'auto'}
            onChange={(e) => onChange('size', e.target.value)}
          >
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}

      {imageSizes && (
        <label className="field inline">
          <span>尺寸</span>
          <select value={params.image_size || 'auto'} onChange={(e) => onChange('image_size', e.target.value)}>
            {imageSizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}

      {aspects && (
        <label className="field inline">
          <span>比例</span>
          <select value={params.aspect_ratio || 'auto'} onChange={(e) => onChange('aspect_ratio', e.target.value)}>
            {aspects.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      )}

      {resolutions && (
        <label className="field inline">
          <span>分辨率</span>
          <select value={params.resolution || resolutions[Math.min(1, resolutions.length - 1)]} onChange={(e) => onChange('resolution', e.target.value)}>
            {resolutions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      )}

      {qualities && (
        <label className="field inline">
          <span>画质</span>
          <select value={params.quality || 'auto'} onChange={(e) => onChange('quality', e.target.value)}>
            {qualities.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </label>
      )}

      {kind.thinking && (
        <label className="field inline">
          <span>思考</span>
          <select value={params.thinking_level || 'none'} onChange={(e) => onChange('thinking_level', e.target.value)}>
            <option value="none">关闭</option>
            <option value="minimal">minimal</option>
            <option value="high">high</option>
          </select>
        </label>
      )}

      {kind.seed && (
        <label className="field inline">
          <span>种子</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="随机"
            style={{ width: '5.5em' }}
            value={params.seed ?? ''}
            onChange={(e) => onChange('seed', e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </label>
      )}

      {kind.watermark && (
        <label className="field inline check">
          <input
            type="checkbox"
            checked={params.watermark === true}
            onChange={(e) => onChange('watermark', e.target.checked)}
          />
          <span>添加水印</span>
        </label>
      )}

      {protocol === 'openai-images' && (
        <label className="field inline">
          <span>格式</span>
          <select value={params.output_format || 'png'} onChange={(e) => onChange('output_format', e.target.value)}>
            <option value="png">png</option>
            <option value="jpeg">jpeg</option>
            <option value="webp">webp</option>
          </select>
        </label>
      )}

      {maxN > 1 && (
        <label className="field inline">
          <span>数量</span>
          <select value={String(params.num_images || 1)} onChange={(e) => onChange('num_images', Number(e.target.value))}>
            {Array.from({ length: maxN }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
