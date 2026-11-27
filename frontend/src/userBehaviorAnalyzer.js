/**
 * 用户行为分析模块
 * 收集和分析用户交互模式，支持用户识别和个性化推荐
 */

// 行为数据结构
const BehaviorData = {
  userId: '',
  sessionStartTime: null,
  sessionEndTime: null,
  messageCount: 0,
  totalMessageLength: 0,
  interactionTimes: [],
  pageVisits: {},
  featureUsage: {},
  timeSpent: {},
  emotionalPatterns: []
}

// 用户行为分析器类
class UserBehaviorAnalyzer {
  constructor() {
    this.currentSessions = new Map() // 当前活跃会话
    this.behaviorHistory = new Map() // 行为历史记录
    this.loadBehaviorHistory()
  }

  // 加载行为历史数据
  loadBehaviorHistory() {
    const savedHistory = localStorage.getItem('psych_user_behavior_history')
    if (savedHistory) {
      const history = JSON.parse(savedHistory)
      history.forEach(record => {
        if (!this.behaviorHistory.has(record.userId)) {
          this.behaviorHistory.set(record.userId, [])
        }
        this.behaviorHistory.get(record.userId).push(record)
      })
    }
  }

  // 保存行为历史数据
  saveBehaviorHistory() {
    const allRecords = []
    for (const [userId, records] of this.behaviorHistory.entries()) {
      allRecords.push(...records)
    }
    localStorage.setItem('psych_user_behavior_history', JSON.stringify(allRecords))
  }

  // 开始用户会话
  startSession(userId) {
    const sessionData = {
      ...BehaviorData,
      userId: userId,
      sessionStartTime: new Date().toISOString(),
      pageVisits: { chat: 1, reports: 0, community: 0, settings: 0 },
      featureUsage: { 
        modelSelection: 0, 
        empathyStyleChange: 0,
        themeChange: 0,
        fontSizeChange: 0,
        languageChange: 0
      },
      timeSpent: { chat: 0, reports: 0, community: 0, settings: 0 }
    }
    
    this.currentSessions.set(userId, sessionData)
    return sessionData
  }

  // 结束用户会话
  endSession(userId) {
    const sessionData = this.currentSessions.get(userId)
    if (!sessionData) return null

    sessionData.sessionEndTime = new Date().toISOString()
    
    // 计算会话时长
    const startTime = new Date(sessionData.sessionStartTime)
    const endTime = new Date(sessionData.sessionEndTime)
    sessionData.sessionDuration = Math.floor((endTime - startTime) / 1000) // 秒
    
    // 保存到历史记录
    if (!this.behaviorHistory.has(userId)) {
      this.behaviorHistory.set(userId, [])
    }
    this.behaviorHistory.get(userId).push(sessionData)
    
    // 限制历史记录数量（保留最近100条）
    const history = this.behaviorHistory.get(userId)
    if (history.length > 100) {
      this.behaviorHistory.set(userId, history.slice(-100))
    }
    
    this.currentSessions.delete(userId)
    this.saveBehaviorHistory()
    
    return sessionData
  }

  // 记录消息发送
  recordMessage(userId, messageLength) {
    const sessionData = this.currentSessions.get(userId)
    if (!sessionData) return

    sessionData.messageCount++
    sessionData.totalMessageLength += messageLength
    
    // 记录发送时间
    const now = new Date()
    sessionData.interactionTimes.push({
      type: 'message',
      timestamp: now.toISOString(),
      hour: now.getHours(),
      day: now.getDay()
    })
  }

  // 记录页面访问
  recordPageVisit(userId, pageName) {
    const sessionData = this.currentSessions.get(userId)
    if (!sessionData) return

    sessionData.pageVisits[pageName] = (sessionData.pageVisits[pageName] || 0) + 1
  }

  // 记录功能使用
  recordFeatureUsage(userId, featureName) {
    const sessionData = this.currentSessions.get(userId)
    if (!sessionData) return

    sessionData.featureUsage[featureName] = (sessionData.featureUsage[featureName] || 0) + 1
  }

  // 记录页面停留时间
  recordTimeSpent(userId, pageName, seconds) {
    const sessionData = this.currentSessions.get(userId)
    if (!sessionData) return

    sessionData.timeSpent[pageName] = (sessionData.timeSpent[pageName] || 0) + seconds
  }

  // 分析情绪模式
  analyzeEmotionalPattern(userId, emotionData) {
    const sessionData = this.currentSessions.get(userId)
    if (!sessionData) return

    sessionData.emotionalPatterns.push({
      timestamp: new Date().toISOString(),
      emotion: emotionData.emotion,
      intensity: emotionData.intensity,
      context: emotionData.context
    })
  }

  // 获取用户行为统计
  getUserBehaviorStats(userId) {
    const history = this.behaviorHistory.get(userId) || []
    if (history.length === 0) return null

    let totalSessions = history.length
    let totalMessages = 0
    let totalDuration = 0
    let totalMessageLength = 0
    let pageVisitStats = {}
    let featureUsageStats = {}
    let timeSpentStats = {}

    // 统计数据
    history.forEach(session => {
      totalMessages += session.messageCount
      totalDuration += session.sessionDuration || 0
      totalMessageLength += session.totalMessageLength

      // 合并页面访问统计
      Object.entries(session.pageVisits || {}).forEach(([page, count]) => {
        pageVisitStats[page] = (pageVisitStats[page] || 0) + count
      })

      // 合并功能使用统计
      Object.entries(session.featureUsage || {}).forEach(([feature, count]) => {
        featureUsageStats[feature] = (featureUsageStats[feature] || 0) + count
      })

      // 合并时间花费统计
      Object.entries(session.timeSpent || {}).forEach(([page, seconds]) => {
        timeSpentStats[page] = (timeSpentStats[page] || 0) + seconds
      })
    })

    return {
      userId,
      totalSessions,
      avgSessionDuration: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
      avgMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0,
      avgMessageLength: totalMessages > 0 ? Math.round(totalMessageLength / totalMessages) : 0,
      pageVisits: pageVisitStats,
      featureUsage: featureUsageStats,
      timeSpent: timeSpentStats,
      lastActive: history.length > 0 ? history[history.length - 1].sessionEndTime : null
    }
  }

  // 获取用户活跃度分析
  getUserActivityPattern(userId) {
    const history = this.behaviorHistory.get(userId) || []
    if (history.length === 0) return null

    const hourlyPattern = new Array(24).fill(0)
    const dailyPattern = new Array(7).fill(0)
    const interactionCounts = []

    // 分析交互时间模式
    history.forEach(session => {
      session.interactionTimes?.forEach(interaction => {
        hourlyPattern[interaction.hour]++
        dailyPattern[interaction.day]++
      })
      interactionCounts.push(session.messageCount)
    })

    // 找出最活跃的时间段
    const mostActiveHour = hourlyPattern.indexOf(Math.max(...hourlyPattern))
    const mostActiveDay = dailyPattern.indexOf(Math.max(...dailyPattern))

    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    return {
      hourlyPattern,
      dailyPattern,
      mostActiveHour,
      mostActiveDay: dayNames[mostActiveDay],
      avgInteractionsPerSession: interactionCounts.length > 0 
        ? Math.round(interactionCounts.reduce((a, b) => a + b, 0) / interactionCounts.length)
        : 0,
      interactionTrend: this.calculateInteractionTrend(interactionCounts)
    }
  }

  // 计算交互趋势
  calculateInteractionTrend(interactionCounts) {
    if (interactionCounts.length < 2) return 'stable'

    const recent = interactionCounts.slice(-3)
    const older = interactionCounts.slice(-6, -3)
    
    if (older.length === 0) return 'stable'

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

    const change = (recentAvg - olderAvg) / olderAvg

    if (change > 0.2) return 'increasing'
    if (change < -0.2) return 'decreasing'
    return 'stable'
  }

  // 生成用户行为洞察
  generateBehaviorInsights(userId) {
    const stats = this.getUserBehaviorStats(userId)
    const activity = this.getUserActivityPattern(userId)

    if (!stats || !activity) return null

    const insights = []

    // 会话频率洞察
    if (stats.totalSessions > 10) {
      insights.push('您是一位活跃用户，经常使用心理支持服务')
    } else if (stats.totalSessions > 5) {
      insights.push('您定期使用心理支持服务，保持良好的心理健康习惯')
    }

    // 交互深度洞察
    if (stats.avgMessagesPerSession > 10) {
      insights.push('您喜欢深入交流，每次会话都有充分的互动')
    } else if (stats.avgMessagesPerSession < 3) {
      insights.push('您倾向于简短交流，注重效率')
    }

    // 活跃度洞察
    insights.push(`您通常在${activity.mostActiveHour}:00-${activity.mostActiveHour + 1}:00最为活跃`)
    insights.push(`您在${activity.mostActiveDay}使用频率最高`)

    // 页面偏好洞察
    const maxPage = Object.entries(stats.pageVisits).sort((a, b) => b[1] - a[1])[0]
    if (maxPage) {
      const pageNames = {
        chat: '聊天对话',
        reports: '报告中心',
        community: '同行社区',
        settings: '设置'
      }
      insights.push(`您最常访问的功能是${pageNames[maxPage[0]] || maxPage[0]}`)
    }

    // 趋势洞察
    if (activity.interactionTrend === 'increasing') {
      insights.push('近期您的使用频率有所增加，建议保持适度使用')
    } else if (activity.interactionTrend === 'decreasing') {
      insights.push('近期您的使用频率有所减少，如有需要随时回来')
    }

    return insights
  }

  // 获取所有用户的行为数据
  getAllUserBehaviorData() {
    const allData = []
    for (const [userId, records] of this.behaviorHistory.entries()) {
      const stats = this.getUserBehaviorStats(userId)
      if (stats) {
        allData.push(stats)
      }
    }
    return allData
  }

  // 清除用户行为数据
  clearUserBehaviorData(userId = null) {
    if (userId) {
      this.behaviorHistory.delete(userId)
    } else {
      this.behaviorHistory.clear()
    }
    this.saveBehaviorHistory()
  }

  // 获取当前活跃会话
  getCurrentSession(userId) {
    return this.currentSessions.get(userId)
  }
}

// 导出用户行为分析器实例
export const userBehaviorAnalyzer = new UserBehaviorAnalyzer()
