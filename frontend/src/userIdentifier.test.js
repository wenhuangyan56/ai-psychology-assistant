/**
 * 用户识别测试模块
 * 提供用户识别功能的测试和验证机制
 */

import { userIdentifier } from './userIdentifier.js'

// 导入测试语料库
import { userTestCorpus } from './userTestCorpus.js'

// 使用年龄段测试数据
const testCases = userTestCorpus

// 用户识别测试类
class UserIdentifierTest {
  constructor() {
    this.testResults = []
    this.accuracyHistory = []
  }

  // 初始化测试数据
  initializeTestData() {
    console.log('初始化用户识别测试数据...')
    
    // 清除现有测试数据
    userIdentifier.clearAllProfiles()
    
    // 为每个测试用户创建特征模板
    Object.values(testCases).forEach(user => {
      user.messages.forEach(message => {
        userIdentifier.analyzeUserInput(message, user.userId)
      })
      console.log(`已创建用户 ${user.userId} 的特征模板`)
    })
    
    console.log('测试数据初始化完成')
  }

  // 运行识别测试
  runIdentificationTests() {
    console.log('\n开始运行用户识别测试...')
    
    let totalTests = 0
    let correctIdentifications = 0
    const userResults = {}
    
    Object.entries(testCases).forEach(([userKey, user]) => {
      console.log(`\n测试用户: ${user.name} (${user.userId})`)
      userResults[user.userId] = { correct: 0, total: 0 }
      
      user.messages.forEach((message, index) => {
        totalTests++
        userResults[user.userId].total++
        
        const result = userIdentifier.getIdentificationResult(message)
        
        console.log(`  消息 ${index + 1}: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`)
        
        if (result.identified && result.userId === user.userId) {
          correctIdentifications++
          userResults[user.userId].correct++
          console.log(`  ✓ 识别正确: ${user.name} (置信度: ${result.confidence})`)
        } else {
          const identifiedUserId = result.identified ? result.userId : '未识别'
          const identifiedUser = Object.values(testCases).find(u => u.userId === identifiedUserId)
          const identifiedName = identifiedUser ? identifiedUser.name : '未识别'
          console.log(`  ✗ 识别错误: 期望 ${user.name}, 实际 ${identifiedName}`)
        }
      })
    })
    
    const accuracy = (correctIdentifications / totalTests * 100).toFixed(2)
    this.accuracyHistory.push({
      timestamp: new Date().toISOString(),
      accuracy: parseFloat(accuracy),
      tests: totalTests,
      correct: correctIdentifications
    })
    
    console.log(`\n测试结果汇总:`)
    Object.entries(userResults).forEach(([userId, result]) => {
      const user = Object.values(testCases).find(u => u.userId === userId)
      const userAccuracy = (result.correct / result.total * 100).toFixed(2)
      console.log(`  ${user.name}: ${result.correct}/${result.total} 正确 (准确率: ${userAccuracy}%)`)
    })
    
    console.log(`\n总体测试完成: ${correctIdentifications}/${totalTests} 正确 (总体准确率: ${accuracy}%)`)
    
    return {
      totalTests,
      correctIdentifications,
      accuracy: parseFloat(accuracy),
      userResults
    }
  }

  // 测试不同阈值的识别效果
  testThresholds() {
    console.log('\n测试不同识别阈值的效果...')
    
    const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
    const results = []
    
    thresholds.forEach(threshold => {
      userIdentifier.threshold = threshold
      const result = this.runIdentificationTests()
      results.push({
        threshold,
        ...result
      })
    })
    
    // 恢复默认阈值
    userIdentifier.threshold = 0.6
    
    console.log('\n阈值测试结果:')
    results.forEach(result => {
      console.log(`  阈值 ${result.threshold}: ${result.accuracy}% 准确率`)
    })
    
    return results
  }

  // 测试用户特征提取
  testFeatureExtraction() {
    console.log('\n测试用户特征提取...')
    
    const testMessage = '你好！我最近感觉压力很大，工作上遇到了一些困难。希望能得到一些专业的建议和支持。谢谢！'
    
    const features = userIdentifier.analyzeUserInput(testMessage, 'test-feature')
    
    console.log('提取的特征:')
    console.log('  词汇特征:', features.languageFeatures.vocabulary)
    console.log('  句子长度分布:', features.languageFeatures.sentenceLength)
    console.log('  标点使用:', features.languageFeatures.punctuation)
    console.log('  表情使用:', features.languageFeatures.emojiUsage)
    
    return features
  }

  // 测试用户识别边界情况
  testEdgeCases() {
    console.log('\n测试用户识别边界情况...')
    
    const edgeCases = [
      { name: '空消息', message: '' },
      { name: '简短消息', message: '嗨' },
      { name: '重复消息', message: '测试测试测试' },
      { name: '特殊字符', message: '!@#$%^&*()_+' },
      { name: '混合语言', message: 'Hello 你好 world 世界' }
    ]
    
    edgeCases.forEach(({ name, message }) => {
      console.log(`\n测试: ${name}`)
      console.log(`  消息: "${message}"`)
      
      try {
        const result = userIdentifier.getIdentificationResult(message)
        if (result.identified) {
          console.log(`  识别结果: ${result.userId} (置信度: ${result.confidence})`)
        } else {
          console.log('  识别结果: 未识别')
        }
      } catch (error) {
        console.log(`  错误: ${error.message}`)
      }
    })
  }

  // 生成测试报告
  generateTestReport() {
    console.log('\n' + '='.repeat(60))
    console.log('用户识别系统测试报告')
    console.log('='.repeat(60))
    
    const profiles = userIdentifier.getAllProfiles()
    console.log(`\n当前用户特征模板数: ${profiles.length}`)
    
    profiles.forEach(profile => {
      // 查找对应的测试用户信息
      const testUser = Object.values(testCases).find(u => u.userId === profile.userId)
      const userName = testUser ? testUser.name : '未知用户'
      
      console.log(`\n用户: ${userName} (${profile.userId})`)
      console.log(`  词汇特征: ${profile.languageFeatures.vocabulary.slice(0, 8).join(', ')}${profile.languageFeatures.vocabulary.length > 8 ? '...' : ''}`)
      console.log(`  句子长度分布: 短句 ${profile.languageFeatures.sentenceLength.short || 0}条, 中句 ${profile.languageFeatures.sentenceLength.medium || 0}条, 长句 ${profile.languageFeatures.sentenceLength.long || 0}条`)
      console.log(`  �标点使用: 逗号 ${profile.languageFeatures.punctuation.comma || 0}次, 句号 ${profile.languageFeatures.punctuation.period || 0}次, 感叹号 ${profile.languageFeatures.punctuation.exclamation || 0}次`)
      console.log(`  表情使用: ${profile.languageFeatures.emojiUsage.length > 0 ? profile.languageFeatures.emojiUsage.join(' ') : '无'}`)
      console.log(`  偏好设置: ${profile.preferences.empathyStyle}风格, ${profile.preferences.theme}主题`)
    })
    
    if (this.accuracyHistory.length > 0) {
      console.log('\n准确率历史记录:')
      this.accuracyHistory.forEach((record, index) => {
        console.log(`  测试 ${index + 1}: ${record.accuracy}% (${record.correct}/${record.tests} 正确)`)
      })
    }
    
    // 显示年龄段特征对比
    console.log('\n年龄段语言特征对比:')
    Object.values(testCases).forEach(user => {
      console.log(`\n${user.name}:`)
      console.log(`  常用词汇: ${user.characteristics.vocabulary.slice(0, 5).join(', ')}`)
      console.log(`  句子特征: ${user.characteristics.sentenceLength.short}短句, ${user.characteristics.sentenceLength.medium}中句, ${user.characteristics.sentenceLength.long}长句`)
      console.log(`  表情使用: ${user.characteristics.emojiUsage.length > 0 ? user.characteristics.emojiUsage.join(' ') : '很少使用'}`)
    })
    
    console.log('\n' + '='.repeat(60))
  }

  // 运行完整测试套件
  runFullTestSuite() {
    console.log('开始运行完整用户识别测试套件...')
    
    this.initializeTestData()
    this.testFeatureExtraction()
    const identificationResults = this.runIdentificationTests()
    const thresholdResults = this.testThresholds()
    this.testEdgeCases()
    this.generateTestReport()
    
    return {
      identificationResults,
      thresholdResults,
      profiles: userIdentifier.getAllProfiles().length
    }
  }

  // 验证识别准确性
  validateIdentificationAccuracy() {
    console.log('\n验证用户识别准确性...')
    
    const results = this.runIdentificationTests()
    const minAccuracy = 70 // 最低可接受准确率
    
    if (results.accuracy >= minAccuracy) {
      console.log(`识别准确率达标: ${results.accuracy}% (要求: ${minAccuracy}%)`)
      return true
    } else {
      console.log(`识别准确率不达标: ${results.accuracy}% (要求: ${minAccuracy}%)`)
      return false
    }
  }

  // 清理测试数据
  cleanupTestData() {
    console.log('\n清理测试数据...')
    userIdentifier.clearAllProfiles()
    console.log('测试数据清理完成')
  }
}

// 导出测试实例
export const userIdentifierTest = new UserIdentifierTest()

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined' && window.location && window.location.pathname.includes('test')) {
  userIdentifierTest.runFullTestSuite()
}
