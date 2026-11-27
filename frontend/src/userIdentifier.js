/**
 * 用户识别模块
 * 基于用户输入风格、语言特征和行为模式进行智能识别
 */

// 用户特征模板结构
const UserProfile = {
  userId: '',
  languageFeatures: {
    vocabulary: [],      // 常用词汇
    sentenceLength: {},  // 句子长度分布
    punctuation: {},     // 标点使用习惯
    emojiUsage: []       // 表情使用习惯
  },
  behavioralPatterns: {
    messageFrequency: {}, // 消息发送频率
    sessionDuration: [],  // 会话时长
    interactionTimes: []  // 交互时间点
  },
  preferences: {
    empathyStyle: '',     // 共情风格偏好
    theme: '',            // 主题偏好
    fontSize: '',         // 字体大小偏好
    language: ''          // 语言偏好
  },
  accuracy: 0            // 识别准确率
}

// 用户识别器类
class UserIdentifier {
  constructor() {
    this.userProfiles = new Map() // 存储用户特征模板
    this.currentScores = new Map() // 当前用户匹配分数
    this.threshold = 0.9 // 识别阈值（90%）
    this.loadProfiles()
  }

  // 加载用户特征模板
  loadProfiles() {
    const savedProfiles = localStorage.getItem('psych_user_profiles')
    if (savedProfiles) {
      const profiles = JSON.parse(savedProfiles)
      profiles.forEach(profile => {
        this.userProfiles.set(profile.userId, profile)
      })
    }
  }

  // 保存用户特征模板
  saveProfiles() {
    const profiles = Array.from(this.userProfiles.values())
    localStorage.setItem('psych_user_profiles', JSON.stringify(profiles))
  }

  // 分析用户输入特征
  analyzeUserInput(text, userId) {
    const features = {
      vocabulary: this.extractVocabulary(text),
      sentenceLength: this.analyzeSentenceLength(text),
      punctuation: this.analyzePunctuation(text),
      emojiUsage: this.extractEmoji(text)
    }

    // 更新或创建用户特征模板
    if (this.userProfiles.has(userId)) {
      this.updateUserProfile(userId, features)
    } else {
      this.createUserProfile(userId, features)
    }

    return features
  }

  // 提取词汇特征
  extractVocabulary(text) {
    const words = text.toLowerCase().match(/[\u4e00-\u9fa5a-zA-Z]+/g) || []
    const wordCount = {}
    
    words.forEach(word => {
      if (word.length > 1) {
        wordCount[word] = (wordCount[word] || 0) + 1
      }
    })

    // 返回使用频率最高的10个词
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }

  // 分析句子长度
  analyzeSentenceLength(text) {
    const sentences = text.split(/[.!?。！？]/).filter(s => s.trim())
    const lengths = sentences.map(s => s.length)
    
    const distribution = {
      short: lengths.filter(l => l < 10).length,
      medium: lengths.filter(l => l >= 10 && l < 50).length,
      long: lengths.filter(l => l >= 50).length
    }

    return distribution
  }

  // 分析标点使用
  analyzePunctuation(text) {
    const punctuationCount = {
      comma: (text.match(/[,，]/g) || []).length,
      period: (text.match(/[.。]/g) || []).length,
      exclamation: (text.match(/[!！]/g) || []).length,
      question: (text.match(/[?？]/g) || []).length,
      colon: (text.match(/[:：]/g) || []).length,
      semicolon: (text.match(/[;；]/g) || []).length
    }

    return punctuationCount
  }

  // 提取表情符号
  extractEmoji(text) {
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu
    const emojis = text.match(emojiRegex) || []
    return [...new Set(emojis)]
  }

  // 创建用户特征模板
  createUserProfile(userId, features) {
    const profile = {
      ...UserProfile,
      userId: userId,
      languageFeatures: features,
      preferences: {
        empathyStyle: localStorage.getItem('psych_empathy_style') || 'warm',
        theme: localStorage.getItem('psych_theme') || 'light',
        fontSize: localStorage.getItem('psych_font_size') || 'medium',
        language: localStorage.getItem('app-lang') || 'zh-CN'
      },
      accuracy: 0.5
    }

    this.userProfiles.set(userId, profile)
    this.saveProfiles()
  }

  // 更新用户特征模板
  updateUserProfile(userId, newFeatures) {
    const profile = this.userProfiles.get(userId)
    
    // 合并语言特征
    profile.languageFeatures.vocabulary = [
      ...new Set([...profile.languageFeatures.vocabulary, ...newFeatures.vocabulary])
    ].slice(0, 10)

    // 合并句子长度分布
    Object.keys(newFeatures.sentenceLength).forEach(key => {
      profile.languageFeatures.sentenceLength[key] = 
        (profile.languageFeatures.sentenceLength[key] || 0) + newFeatures.sentenceLength[key]
    })

    // 合并标点使用
    Object.keys(newFeatures.punctuation).forEach(key => {
      profile.languageFeatures.punctuation[key] = 
        (profile.languageFeatures.punctuation[key] || 0) + newFeatures.punctuation[key]
    })

    // 合并表情使用
    profile.languageFeatures.emojiUsage = [
      ...new Set([...profile.languageFeatures.emojiUsage, ...newFeatures.emojiUsage])
    ]

    // 更新偏好设置
    profile.preferences = {
      empathyStyle: localStorage.getItem('psych_empathy_style') || profile.preferences.empathyStyle,
      theme: localStorage.getItem('psych_theme') || profile.preferences.theme,
      fontSize: localStorage.getItem('psych_font_size') || profile.preferences.fontSize,
      language: localStorage.getItem('app-lang') || profile.preferences.language
    }

    this.saveProfiles()
  }

  // 识别用户
  identifyUser(text) {
    if (this.userProfiles.size === 0) {
      return null // 没有用户模板，无法识别
    }

    const inputFeatures = {
      vocabulary: this.extractVocabulary(text),
      sentenceLength: this.analyzeSentenceLength(text),
      punctuation: this.analyzePunctuation(text),
      emojiUsage: this.extractEmoji(text)
    }

    let bestMatch = null
    let highestScore = 0

    // 计算与每个用户模板的匹配度
    for (const [userId, profile] of this.userProfiles.entries()) {
      const score = this.calculateSimilarity(inputFeatures, profile.languageFeatures)
      
      if (score > highestScore && score >= this.threshold) {
        highestScore = score
        bestMatch = {
          userId: userId,
          score: score,
          profile: profile
        }
      }
    }

    return bestMatch
  }

  // 计算特征相似度
  calculateSimilarity(inputFeatures, profileFeatures) {
    let totalScore = 0
    let featureCount = 0

    // 词汇相似度
    const vocabSimilarity = this.calculateVocabularySimilarity(
      inputFeatures.vocabulary,
      profileFeatures.vocabulary
    )
    totalScore += vocabSimilarity
    featureCount++

    // 句子长度分布相似度
    const lengthSimilarity = this.calculateDistributionSimilarity(
      inputFeatures.sentenceLength,
      profileFeatures.sentenceLength
    )
    totalScore += lengthSimilarity
    featureCount++

    // 标点使用相似度
    const punctuationSimilarity = this.calculateDistributionSimilarity(
      inputFeatures.punctuation,
      profileFeatures.punctuation
    )
    totalScore += punctuationSimilarity
    featureCount++

    // 表情使用相似度
    const emojiSimilarity = this.calculateEmojiSimilarity(
      inputFeatures.emojiUsage,
      profileFeatures.emojiUsage
    )
    totalScore += emojiSimilarity
    featureCount++

    return totalScore / featureCount
  }

  // 计算词汇相似度（Jaccard系数）
  calculateVocabularySimilarity(inputVocab, profileVocab) {
    const inputSet = new Set(inputVocab)
    const profileSet = new Set(profileVocab)
    const intersection = new Set([...inputSet].filter(x => profileSet.has(x)))
    
    return intersection.size / Math.max(inputSet.size, profileSet.size)
  }

  // 计算分布相似度（余弦相似度）
  calculateDistributionSimilarity(inputDist, profileDist) {
    const allKeys = new Set([...Object.keys(inputDist), ...Object.keys(profileDist)])
    let dotProduct = 0
    let inputNorm = 0
    let profileNorm = 0

    for (const key of allKeys) {
      const inputValue = inputDist[key] || 0
      const profileValue = profileDist[key] || 0
      
      dotProduct += inputValue * profileValue
      inputNorm += inputValue * inputValue
      profileNorm += profileValue * profileValue
    }

    if (inputNorm === 0 || profileNorm === 0) return 0
    return dotProduct / (Math.sqrt(inputNorm) * Math.sqrt(profileNorm))
  }

  // 计算表情相似度
  calculateEmojiSimilarity(inputEmojis, profileEmojis) {
    const inputSet = new Set(inputEmojis)
    const profileSet = new Set(profileEmojis)
    const intersection = new Set([...inputSet].filter(x => profileSet.has(x)))
    
    return intersection.size / Math.max(inputSet.size, profileSet.size)
  }

  // 获取用户识别结果
  getIdentificationResult(text) {
    const result = this.identifyUser(text)
    if (result) {
      return {
        identified: true,
        userId: result.userId,
        confidence: Math.round(result.score * 100) + '%',
        profile: result.profile
      }
    }
    return { identified: false }
  }

  // 清除所有用户特征模板
  clearAllProfiles() {
    this.userProfiles.clear()
    localStorage.removeItem('psych_user_profiles')
  }

  // 获取所有用户特征模板
  getAllProfiles() {
    return Array.from(this.userProfiles.values())
  }
}

// 导出用户识别器实例
export const userIdentifier = new UserIdentifier()
