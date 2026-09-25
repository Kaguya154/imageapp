// 模型目录 —— 依据 Modelink 官方文档整理
// https://docs.modelink.ai/api/image-openai-gpt-image-2  (OpenAI 兼容)
// https://docs.modelink.ai/api/image-fal-*               (FAL 异步队列)
// https://docs.modelink.ai/api/image-openai-gemini-chat  (Chat Completions 生图)

export const DEFAULT_BASE_URL = 'https://api.qnaigc.com'

const ASPECT_GEMINI_STD = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '4:5', '5:4']
const ASPECT_GEMINI_EXT = [...ASPECT_GEMINI_STD, '4:1', '1:4', '8:1', '1:8']
const ASPECT_KLING = ['auto', '16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9']

const GPT_SIZES = ['auto', '1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '3840x2160', '2160x3840']
const FAL_IMAGE_SIZES = ['auto', 'square_hd', 'square', 'landscape_4_3', 'landscape_16_9', 'portrait_4_3', 'portrait_16_9']

/**
 * protocol 取值:
 *  - 'openai-images' : /v1/images/generations 与 /v1/images/edits（同步, Bearer）
 *  - 'chat'          : /v1/chat/completions（同步, Bearer, 图片位于 message.images）
 *  - 'fal'           : /queue/... 异步队列（Bearer / Key）
 */
export const MODELS = [
  {
    id: 'openai/gpt-image-2',
    name: 'GPT-Image-2',
    provider: 'OpenAI',
    protocols: ['openai-images', 'fal'],
    defaultProtocol: 'openai-images',
    kinds: {
      'openai-images': { quality: ['auto', 'low', 'medium', 'high'], sizes: GPT_SIZES, maxRefs: 16, maxN: 10 },
      fal: { quality: ['auto', 'low', 'medium', 'high'], imageSizes: FAL_IMAGE_SIZES, maxRefs: 10, maxN: 4 },
    },
    fal: {
      submit: '/queue/openai/gpt-image-2',
      edit: '/queue/openai/gpt-image-2/edit',
      statusOf: (id) => `/queue/openai/gpt-image-2/requests/${id}/status`,
      resultOf: (id) => `/queue/openai/gpt-image-2/requests/${id}`,
    },
    note: 'GPT Image 系列，支持 mask 局部重绘（OpenAI 协议）',
  },
  {
    id: 'openai/gpt-image-2.5-flare',
    name: 'GPT-Image-2.5-Flare',
    provider: 'OpenAI',
    protocols: ['openai-images', 'fal'],
    defaultProtocol: 'openai-images',
    kinds: {
      'openai-images': { quality: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'], sizes: GPT_SIZES, maxRefs: 16, maxN: 10 },
      fal: { quality: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'], imageSizes: FAL_IMAGE_SIZES, maxRefs: 16, maxN: 4 },
    },
    fal: {
      submit: '/queue/openai/gpt-image-2.5/flare/text-to-image',
      edit: '/queue/openai/gpt-image-2.5/flare/edit',
      statusOf: (id) => `/queue/openai/gpt-image-2.5/requests/${id}/status`,
      resultOf: (id) => `/queue/openai/gpt-image-2.5/requests/${id}`,
    },
    note: 'GPT Image 2.5 变体，新增 xhigh / max 画质档',
  },
  {
    id: 'openai/gpt-image-2.5-sunburst',
    name: 'GPT-Image-2.5-Sunburst',
    provider: 'OpenAI',
    protocols: ['openai-images', 'fal'],
    defaultProtocol: 'openai-images',
    kinds: {
      'openai-images': { quality: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'], sizes: GPT_SIZES, maxRefs: 16, maxN: 10 },
      fal: { quality: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'], imageSizes: FAL_IMAGE_SIZES, maxRefs: 16, maxN: 4 },
    },
    fal: {
      submit: '/queue/openai/gpt-image-2.5/sunburst/text-to-image',
      edit: '/queue/openai/gpt-image-2.5/sunburst/edit',
      statusOf: (id) => `/queue/openai/gpt-image-2.5/requests/${id}/status`,
      resultOf: (id) => `/queue/openai/gpt-image-2.5/requests/${id}`,
    },
    note: 'GPT Image 2.5 变体，新增 xhigh / max 画质档',
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini-2.5-Flash-Image',
    provider: 'Google',
    protocols: ['chat'],
    defaultProtocol: 'chat',
    kinds: {
      chat: { aspects: ASPECT_GEMINI_STD, resolutions: ['512', '1K', '2K', '4K'], maxRefs: 8 },
    },
    note: 'Gemini 2.5 Flash 图片模型（Chat 协议）',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini-3.0-Pro-Image',
    provider: 'Google',
    protocols: ['chat', 'fal'],
    defaultProtocol: 'fal',
    kinds: {
      chat: { aspects: ASPECT_GEMINI_STD, resolutions: ['1K', '2K', '4K'], maxRefs: 8 },
      fal: { aspects: ASPECT_GEMINI_STD, resolutions: ['1K', '2K', '4K'], maxRefs: 8 },
    },
    fal: {
      submit: '/queue/fal-ai/gemini-3-pro-image-preview',
      edit: '/queue/fal-ai/gemini-3-pro-image-preview/edit',
      statusOf: (id) => `/queue/fal-ai/gemini-3-pro-image-preview/requests/${id}/status`,
      resultOf: (id) => `/queue/fal-ai/gemini-3-pro-image-preview/requests/${id}`,
    },
    note: 'Gemini 3.0 Pro 图片模型，质量优先',
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Gemini-3.1-Flash-Image',
    provider: 'Google',
    protocols: ['chat', 'fal'],
    defaultProtocol: 'fal',
    kinds: {
      chat: { aspects: ASPECT_GEMINI_EXT, resolutions: ['512', '1K', '2K', '4K'], maxRefs: 8 },
      fal: { aspects: ASPECT_GEMINI_EXT, resolutions: ['0.5K', '1K', '2K', '4K'], maxRefs: 8, thinking: true },
    },
    fal: {
      submit: '/queue/fal-ai/gemini-3.1-flash-image-preview',
      edit: '/queue/fal-ai/gemini-3.1-flash-image-preview/edit',
      statusOf: (id) => `/queue/fal-ai/gemini-3.1-flash-image-preview/requests/${id}/status`,
      resultOf: (id) => `/queue/fal-ai/gemini-3.1-flash-image-preview/requests/${id}`,
    },
    note: 'Gemini 3.1 Flash 图片模型，支持极端比例与思考等级',
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini-3.1-Flash-Lite-Image',
    provider: 'Google',
    protocols: ['chat', 'fal'],
    defaultProtocol: 'fal',
    kinds: {
      chat: { aspects: ASPECT_GEMINI_EXT, resolutions: ['512', '1K', '2K', '4K'], maxRefs: 8 },
      fal: { aspects: ASPECT_GEMINI_EXT, maxRefs: 8, thinking: true, maxN: 1 },
    },
    fal: {
      submit: '/queue/google/nano-banana-2-lite',
      edit: '/queue/google/nano-banana-2-lite/edit',
      statusOf: (id) => `/queue/google/nano-banana-2-lite/requests/${id}/status`,
      resultOf: (id) => `/queue/google/nano-banana-2-lite/requests/${id}`,
    },
    note: '轻量快速的 Gemini 3.1 图片模型（单张输出）',
  },
  {
    id: 'kling-image-o1',
    name: 'Kling-Image-O1',
    provider: 'Kling',
    protocols: ['fal'],
    defaultProtocol: 'fal',
    kinds: {
      fal: { aspects: ASPECT_KLING, resolutions: ['1K', '2K'], maxRefs: 10, maxN: 9, promptMax: 2500 },
    },
    fal: {
      submit: '/queue/fal-ai/kling-image/o1',
      edit: '/queue/fal-ai/kling-image/o1',
      statusOf: (id) => `/queue/fal-ai/kling-image/requests/${id}/status`,
      resultOf: (id) => `/queue/fal-ai/kling-image/requests/${id}`,
    },
    note: '可灵图片 O1，参考图通过 <<<image_N>>> 语法引用',
  },
]

export function getModel(id) {
  return MODELS.find((m) => m.id === id) || MODELS[0]
}

export function protocolLabel(p) {
  return { 'openai-images': 'OpenAI', chat: 'Chat', fal: 'FAL 异步' }[p] || p
}
