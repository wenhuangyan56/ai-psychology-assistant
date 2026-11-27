const STOP_WORDS = ['的', '了', '吗', '呢', '啊', '吧', '哦', '嗯', '啊', '呀', '呢', '吗', '吧', '哦', '嗯', '这', '那', '是', '有', '在', '和', '了', '我', '你', '他', '她', '它', '我们', '你们', '他们', '这个', '那个', '什么', '怎么', '为什么', '因为', '所以', '但是', '如果', '虽然', '还是', '或者', '以及', '等等', '一些', '所有', '每个', '任何', '没有', '可以', '应该', '会', '可能', '知道', '觉得', '认为', '希望', '想要', '需要', '必须', '能够', '应该', '可以', '可能', '会', '要', '得', '能', '会', '可以', '应该', '必须', '需要', '想要', '希望', '认为', '觉得', '知道', '说', '看', '听', '想', '做', '去', '来', '走', '跑', '跳', '飞', '吃', '喝', '睡', '玩', '学习', '工作', '生活', '说话', '聊天', '讨论', '思考', '感觉', '感受', '情绪', '心情', '状态', '问题', '事情', '东西', '时间', '地方', '人', '事', '物']

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu

const PUNCTUATION_REGEX = /[.!?！？。]/g

const FEATURE_DIMENSIONS = {
  LANGUAGE_STYLE: { start: 0, count: 5 },
  INTERACTION_BEHAVIOR: { start: 5, count: 4 },
  PREFERENCE_SETTINGS: { start: 9, count: 4 },
  TOTAL: 13
}

const FEATURE_WEIGHTS = {
  LANGUAGE_STYLE: 0.5,
  INTERACTION_BEHAVIOR: 0.3,
  PREFERENCE_SETTINGS: 0.2
}

const PREFERENCE_CODES = {
  EMPATHY_STYLE: { warm: 0, professional: 1, concise: 2 },
  LANGUAGE: { zh: 0, en: 1 },
  THEME: { light: 0, dark: 1 },
  MODEL: { deepseek: 0, dashscope: 1, zhipu: 2, auto: 3 }
}

let inputStartTime = null
let inputEndTime = null
let inputCharCount = 0
let inputModifyCount = 0
let responseReceivedTime = null
let roundStartTime = null
let roundIntervals = []
let userPreferences = {
  empathyStyle: 'warm',
  language: 'zh',
  theme: 'light',
  model: 'auto'
}

export function setUserPreferences(preferences) {
  userPreferences = { ...userPreferences, ...preferences }
}

export function getCurrentPreferences() {
  return { ...userPreferences }
}

export function startInput() {
  inputStartTime = Date.now()
  inputCharCount = 0
  inputModifyCount = 0
}

export function recordInputChange(charCount, modifyCount = 0) {
  inputCharCount = charCount
  inputModifyCount += modifyCount
}

export function endInput() {
  inputEndTime = Date.now()
}

export function recordResponseReceived() {
  responseReceivedTime = Date.now()
  roundStartTime = Date.now()
}

export function recordRoundEnd() {
  if (roundStartTime) {
    const now = Date.now()
    roundIntervals.push(now - roundStartTime)
    if (roundIntervals.length > 20) roundIntervals.shift()
    roundStartTime = null
  }
}

export function extractFeatures(userMessage, systemResponse) {
  const features = new Array(FEATURE_DIMENSIONS.TOTAL).fill(0)
  
  const languageFeatures = extractLanguageStyleFeatures(userMessage)
  const interactionFeatures = extractInteractionBehaviorFeatures(userMessage)
  const preferenceFeatures = extractPreferenceSettingsFeatures()
  
  languageFeatures.forEach((val, idx) => {
    features[FEATURE_DIMENSIONS.LANGUAGE_STYLE.start + idx] = val
  })
  
  interactionFeatures.forEach((val, idx) => {
    features[FEATURE_DIMENSIONS.INTERACTION_BEHAVIOR.start + idx] = val
  })
  
  preferenceFeatures.forEach((val, idx) => {
    features[FEATURE_DIMENSIONS.PREFERENCE_SETTINGS.start + idx] = val
  })
  
  recordRoundEnd()
  
  return normalizeFeatures(features)
}

function extractLanguageStyleFeatures(message) {
  const features = new Array(FEATURE_DIMENSIONS.LANGUAGE_STYLE.count).fill(0)
  
  if (!message || message.trim() === '') {
    return features
  }
  
  const text = message.trim()
  const charCount = text.length
  
  features[0] = extractAverageSentenceLength(text)
  features[1] = extractPunctuationFrequency(text, charCount)
  features[2] = extractVocabularyRichness(text)
  features[3] = extractHighFrequencyWords(text)
  features[4] = extractEmojiUsageRate(text, charCount)
  
  return features
}

function extractAverageSentenceLength(text) {
  const sentences = text.split(PUNCTUATION_REGEX).filter(s => s.trim())
  if (sentences.length === 0) return 0.5
  
  const avgLength = text.length / sentences.length
  const normalized = Math.min(avgLength / 100, 1)
  return Math.round(normalized * 100) / 100
}

function extractPunctuationFrequency(text, charCount) {
  if (charCount === 0) return 0
  
  const exclamationCount = (text.match(/[!！]/g) || []).length
  const questionCount = (text.match(/[?？]/g) || []).length
  const frequency = (exclamationCount + questionCount) / charCount
  
  return Math.round(Math.min(frequency * 10, 1) * 100) / 100
}

function extractVocabularyRichness(text) {
  const words = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter(w => w)
  
  if (words.length === 0) return 0.5
  
  const filteredWords = words.filter(w => !STOP_WORDS.includes(w.toLowerCase()))
  const uniqueWords = new Set(filteredWords).size
  const richness = uniqueWords / Math.max(filteredWords.length, 1)
  
  return Math.round(richness * 100) / 100
}

const KEYWORD_CATEGORIES = {
  emotion: ['开心', '高兴', '难过', '伤心', '焦虑', '压力', '担心', '害怕', '快乐', '幸福', '满足', '失望', '沮丧', '痛苦', '烦恼'],
  work: ['工作', '上班', '职场', '同事', '老板', '项目', '任务', '压力'],
  life: ['生活', '家庭', '朋友', '感情', '家人', '日常', '周末', '假期'],
  health: ['身体', '健康', '睡眠', '饮食', '运动', '疾病'],
  mental: ['心理', '情绪', '心情', '抑郁', '放松', '冥想']
}

function extractHighFrequencyWords(text) {
  let maxCount = 0
  let matchedCategory = -1
  
  Object.entries(KEYWORD_CATEGORIES).forEach(([category, keywords], index) => {
    let count = 0
    keywords.forEach(keyword => {
      if (text.includes(keyword)) count++
    })
    if (count > maxCount) {
      maxCount = count
      matchedCategory = index
    }
  })
  
  return matchedCategory >= 0 ? (matchedCategory + 1) / Object.keys(KEYWORD_CATEGORIES).length : 0.5
}

function extractEmojiUsageRate(text, charCount) {
  if (charCount === 0) return 0
  
  const emojis = text.match(EMOJI_REGEX) || []
  const rate = emojis.length / charCount
  
  return Math.round(Math.min(rate * 5, 1) * 100) / 100
}

function extractInteractionBehaviorFeatures(message) {
  const features = new Array(FEATURE_DIMENSIONS.INTERACTION_BEHAVIOR.count).fill(0.5)
  
  if (!message || message.trim() === '') {
    return features
  }
  
  features[0] = extractTypingSpeed(message)
  features[1] = extractModifyFrequency(message)
  features[2] = extractResponseDelay()
  features[3] = extractRoundIntervalStd()
  
  return features
}

function extractTypingSpeed(message) {
  if (!inputStartTime || !inputEndTime) return 0.5
  
  const duration = (inputEndTime - inputStartTime) / 1000
  const charCount = message.length
  
  if (duration <= 0 || charCount === 0) return 0.5
  
  const speed = charCount / duration
  const normalized = Math.min(speed / 10, 1)
  
  return Math.round(normalized * 100) / 100
}

function extractModifyFrequency(message) {
  const charCount = message.length
  if (charCount === 0) return 0.5
  
  const frequency = inputModifyCount / Math.max(charCount, 1)
  return Math.round(Math.min(frequency, 1) * 100) / 100
}

function extractResponseDelay() {
  if (!responseReceivedTime || !inputStartTime) return 0.5
  
  const delay = (inputStartTime - responseReceivedTime) / 1000
  
  if (delay <= 0) return 1.0
  
  const logDelay = Math.log10(Math.max(delay, 1))
  const normalized = 1 - Math.min(logDelay / 3, 1)
  
  return Math.round(normalized * 100) / 100
}

function extractRoundIntervalStd() {
  if (roundIntervals.length < 2) return 0.5
  
  const mean = roundIntervals.reduce((a, b) => a + b, 0) / roundIntervals.length
  const variance = roundIntervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / roundIntervals.length
  const std = Math.sqrt(variance) / 1000
  
  const normalized = Math.min(std / 60, 1)
  
  return Math.round(normalized * 100) / 100
}

function extractPreferenceSettingsFeatures() {
  const features = new Array(FEATURE_DIMENSIONS.PREFERENCE_SETTINGS.count).fill(0)
  
  features[0] = PREFERENCE_CODES.EMPATHY_STYLE[userPreferences.empathyStyle] / Object.keys(PREFERENCE_CODES.EMPATHY_STYLE).length
  features[1] = PREFERENCE_CODES.LANGUAGE[userPreferences.language] / Object.keys(PREFERENCE_CODES.LANGUAGE).length
  features[2] = PREFERENCE_CODES.THEME[userPreferences.theme] / Object.keys(PREFERENCE_CODES.THEME).length
  features[3] = PREFERENCE_CODES.MODEL[userPreferences.model] / Object.keys(PREFERENCE_CODES.MODEL).length
  
  return features
}

function normalizeFeatures(features) {
  const weighted = new Array(features.length).fill(0)
  
  for (let i = 0; i < FEATURE_DIMENSIONS.LANGUAGE_STYLE.count; i++) {
    const idx = FEATURE_DIMENSIONS.LANGUAGE_STYLE.start + i
    weighted[idx] = features[idx] * FEATURE_WEIGHTS.LANGUAGE_STYLE
  }
  
  for (let i = 0; i < FEATURE_DIMENSIONS.INTERACTION_BEHAVIOR.count; i++) {
    const idx = FEATURE_DIMENSIONS.INTERACTION_BEHAVIOR.start + i
    weighted[idx] = features[idx] * FEATURE_WEIGHTS.INTERACTION_BEHAVIOR
  }
  
  for (let i = 0; i < FEATURE_DIMENSIONS.PREFERENCE_SETTINGS.count; i++) {
    const idx = FEATURE_DIMENSIONS.PREFERENCE_SETTINGS.start + i
    weighted[idx] = features[idx] * FEATURE_WEIGHTS.PREFERENCE_SETTINGS
  }
  
  const maxWeight = Math.max(...weighted)
  if (maxWeight > 0) {
    return weighted.map(v => Math.round((v / maxWeight) * 100) / 100)
  }
  
  return weighted.map(v => Math.round(v * 100) / 100)
}

export function getFeatureLabels() {
  return {
    LANGUAGE_STYLE: [
      '平均句子长度',
      '标点使用频率',
      '词汇丰富度',
      '高频词分布',
      '表情符号使用率'
    ],
    INTERACTION_BEHAVIOR: [
      '平均打字速度',
      '修改频率',
      '平均响应延迟',
      '对话轮次间隔'
    ],
    PREFERENCE_SETTINGS: [
      '共情风格',
      '语言',
      '主题模式',
      '模型选择'
    ]
  }
}

export { FEATURE_DIMENSIONS, FEATURE_WEIGHTS, PREFERENCE_CODES }
