/**
 * 情绪指数计算模块
 * 根据用户对话内容、风险等级和行为特征计算情绪指数
 */

// 情绪标签到基础分数的映射
const EMOTION_LABEL_SCORES = {
  '平静': 7,
  '愉悦': 8,
  '开心': 9,
  '轻度焦虑': 5,
  '轻度压力': 5,
  '中度焦虑': 3,
  '中度压力': 3,
  '重度焦虑': 2,
  '重度压力': 2,
  '抑郁': 1,
  '绝望': 1,
  '焦虑': 4,
  '压力': 4,
  '低落': 3,
  '沮丧': 2,
  '愤怒': 2,
  '烦躁': 4
}

// 风险等级修正值
const RISK_LEVEL_ADJUSTMENTS = {
  '低': 1,
  '中': 0,
  '高': -1
}

// 默认基础分数
const DEFAULT_BASE_SCORE = 6

class EmotionIndexCalculator {
  constructor() {
    this.sessionBaseline = null
    this.behaviorHistory = {
      typingSpeeds: [],
      editFrequencies: [],
      responseDelays: []
    }
  }

  /**
   * 分析用户输入，提取情绪标签
   * @param {string} content - 用户输入内容
   * @returns {string} - 情绪标签
   */
  extractEmotionLabel(content) {
    const lowerContent = content.toLowerCase()
    
    // 关键词匹配
    const emotionKeywords = {
      '平静': ['平静', '放松', '安心', '踏实', '稳定'],
      '愉悦': ['开心', '高兴', '快乐', '愉悦', '幸福', '满足'],
      '轻度焦虑': ['有点担心', '有点紧张', '有点不安', '轻微焦虑'],
      '轻度压力': ['有点压力', '有点累', '轻微压力'],
      '中度焦虑': ['焦虑', '紧张', '不安', '担心', '忧虑'],
      '中度压力': ['压力大', '很累', '疲惫', '压力'],
      '重度焦虑': ['非常焦虑', '极度紧张', '严重不安'],
      '重度压力': ['压力很大', '快要崩溃', '不堪重负'],
      '抑郁': ['抑郁', '低落', '沮丧', '难过', '伤心', '绝望', '不想活']
    }

    // 按优先级检查（从严重到轻微）
    const priorityOrder = ['抑郁', '重度焦虑', '重度压力', '中度焦虑', '中度压力', '轻度焦虑', '轻度压力', '愉悦', '平静']
    
    for (const emotion of priorityOrder) {
      for (const keyword of emotionKeywords[emotion]) {
        if (lowerContent.includes(keyword)) {
          return emotion
        }
      }
    }

    // 默认返回平静
    return '平静'
  }

  /**
   * 检测风险等级
   * @param {string} content - 用户输入内容
   * @returns {string} - 风险等级（低/中/高）
   */
  detectRiskLevel(content) {
    const lowerContent = content.toLowerCase()
    
    // 高风险关键词
    const highRiskKeywords = ['自杀', '自虐', '自残', '想死', '活不下去', '结束生命', '跳楼', '割腕', '服药', '上吊', '崩溃', '撑不下去', '没有希望', '生无可恋', '厌世']
    
    // 中风险关键词
    const mediumRiskKeywords = ['压力', '焦虑', '抑郁', '失眠', '情绪低落', '烦躁', '不安', '难过', '伤心', '孤独']

    for (const keyword of highRiskKeywords) {
      if (lowerContent.includes(keyword)) {
        return '高'
      }
    }

    for (const keyword of mediumRiskKeywords) {
      if (lowerContent.includes(keyword)) {
        return '中'
      }
    }

    return '低'
  }

  /**
   * 根据情绪标签获取基础分数
   * @param {string} emotionLabel - 情绪标签
   * @returns {number} - 基础分数
   */
  getBaseScore(emotionLabel) {
    return EMOTION_LABEL_SCORES[emotionLabel] || DEFAULT_BASE_SCORE
  }

  /**
   * 记录用户行为特征
   * @param {Object} behaviorData - 行为数据
   */
  recordBehavior(behaviorData) {
    if (behaviorData.typingSpeed !== undefined) {
      this.behaviorHistory.typingSpeeds.push(behaviorData.typingSpeed)
    }
    if (behaviorData.editFrequency !== undefined) {
      this.behaviorHistory.editFrequencies.push(behaviorData.editFrequency)
    }
    if (behaviorData.responseDelay !== undefined) {
      this.behaviorHistory.responseDelays.push(behaviorData.responseDelay)
    }
  }

  /**
   * 计算行为特征修正值
   * @param {Object} currentBehavior - 当前行为数据
   * @returns {number} - 行为修正值
   */
  calculateBehaviorAdjustment(currentBehavior) {
    let adjustment = 0
    
    // 如果有历史数据，计算与历史平均值的偏差
    const { typingSpeeds, editFrequencies, responseDelays } = this.behaviorHistory
    
    // 打字速度分析
    if (currentBehavior.typingSpeed !== undefined && typingSpeeds.length > 1) {
      const avgSpeed = typingSpeeds.slice(0, -1).reduce((a, b) => a + b, 0) / (typingSpeeds.length - 1)
      const speedDeviation = (currentBehavior.typingSpeed - avgSpeed) / avgSpeed
      if (speedDeviation < -0.3) {
        adjustment -= 0.5 // 打字速度明显减慢，可能情绪低落
      } else if (speedDeviation > 0.5) {
        adjustment += 0.3 // 打字速度加快，可能情绪激动或积极
      }
    }

    // 编辑频率分析
    if (currentBehavior.editFrequency !== undefined && editFrequencies.length > 1) {
      const avgEdit = editFrequencies.slice(0, -1).reduce((a, b) => a + b, 0) / (editFrequencies.length - 1)
      const editDeviation = (currentBehavior.editFrequency - avgEdit) / (avgEdit || 1)
      if (editDeviation > 1) {
        adjustment -= 0.3 // 编辑频率显著增加，可能焦虑或不确定
      }
    }

    // 响应延迟分析
    if (currentBehavior.responseDelay !== undefined && responseDelays.length > 1) {
      const avgDelay = responseDelays.slice(0, -1).reduce((a, b) => a + b, 0) / (responseDelays.length - 1)
      const delayDeviation = (currentBehavior.responseDelay - avgDelay) / (avgDelay || 1)
      if (delayDeviation > 0.5) {
        adjustment -= 0.3 // 响应延迟明显增加，可能情绪低落或思考困难
      }
    }

    return adjustment
  }

  /**
   * 计算情绪指数
   * @param {string} content - 用户输入内容
   * @param {Object} behaviorData - 行为数据（可选）
   * @returns {Object} - 情绪指数结果
   */
  calculateEmotionIndex(content, behaviorData = {}) {
    // 提取情绪标签
    const emotionLabel = this.extractEmotionLabel(content)
    
    // 检测风险等级
    const riskLevel = this.detectRiskLevel(content)
    
    // 获取基础分数
    let baseScore = this.getBaseScore(emotionLabel)
    
    // 风险等级修正
    const riskAdjustment = RISK_LEVEL_ADJUSTMENTS[riskLevel] || 0
    
    // 行为特征修正
    const behaviorAdjustment = this.calculateBehaviorAdjustment(behaviorData)
    
    // 计算最终分数
    let emotionIndex = baseScore + riskAdjustment + behaviorAdjustment
    
    // 限制在0-10范围内
    emotionIndex = Math.max(0, Math.min(10, emotionIndex))
    
    // 设置会话基线（第一次对话时）
    if (this.sessionBaseline === null) {
      this.sessionBaseline = emotionIndex
    }

    // 记录行为数据
    this.recordBehavior(behaviorData)

    return {
      emotionIndex: parseFloat(emotionIndex.toFixed(1)),
      emotionLabel,
      riskLevel,
      baseScore,
      riskAdjustment,
      behaviorAdjustment,
      sessionBaseline: this.sessionBaseline,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 重置会话状态
   */
  resetSession() {
    this.sessionBaseline = null
    this.behaviorHistory = {
      typingSpeeds: [],
      editFrequencies: [],
      responseDelays: []
    }
  }

  /**
   * 分析情绪趋势
   * @param {Array} emotionHistory - 情绪历史数据
   * @returns {Object} - 趋势分析结果
   */
  analyzeTrend(emotionHistory) {
    if (!emotionHistory || emotionHistory.length < 2) {
      return {
        trend: 'stable',
        trendText: '情绪稳定',
        summary: '暂无足够数据进行趋势分析'
      }
    }

    const recent = emotionHistory.slice(-3).map(e => e.emotionIndex)
    const older = emotionHistory.slice(-6, -3).map(e => e.emotionIndex)
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg
    
    const change = recentAvg - olderAvg
    
    let trend, trendText, summary
    
    if (change > 0.5) {
      trend = 'improving'
      trendText = '情绪好转'
      summary = `您的情绪在最近${recent.length}轮对话后呈上升趋势，建议保持积极心态`
    } else if (change < -0.5) {
      trend = 'deteriorating'
      trendText = '情绪低落'
      summary = `您的情绪在最近${recent.length}轮对话后呈下降趋势，建议多关注自身状态，必要时寻求专业帮助`
    } else {
      trend = 'stable'
      trendText = '情绪稳定'
      summary = '您的情绪状态较为稳定，继续保持良好状态'
    }

    return {
      trend,
      trendText,
      summary,
      recentAvg: parseFloat(recentAvg.toFixed(1)),
      olderAvg: parseFloat(olderAvg.toFixed(1)),
      change: parseFloat(change.toFixed(1))
    }
  }
}

// 导出情绪指数计算器实例
export const emotionIndexCalculator = new EmotionIndexCalculator()
