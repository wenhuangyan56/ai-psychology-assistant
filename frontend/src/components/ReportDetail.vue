<template>
  <div v-if="visible" class="report-detail-overlay" @click="close">
    <div class="report-detail-modal" @click.stop>
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <div>
          <h3>报告详情</h3>
          <div class="report-id">报告 ID: {{ report.id }}</div>
        </div>
        <button class="close-btn" @click="close">×</button>
      </div>
      
      <!-- 标签页导�?-->
      <div class="tab-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>
      
      <!-- 标签页内�?-->
      <div class="tab-content">
        <!-- 基本信息 -->
        <div v-if="activeTab === 'basic'" class="tab-pane">
          <div v-if="isLoading" class="loading">加载�?..</div>
          <div v-else class="basic-info">
            <div v-if="report.end_type === '异常退出'" class="warning-banner">
              会话未完成            </div>
            <div class="info-grid">
              <div class="info-item">
                <label>会话ID:</label>
                <span>{{ report.id }}</span>
              </div>
              <div class="info-item">
                <label>创建时间:</label>
                <span>{{ formatTime(getRealStartTime(report, chatMessages)) }}</span>
              </div>
              <div class="info-item">
                <label>结束时间:</label>
                <span>{{ formatTime(getRealEndTime(report, chatMessages)) }}</span>
              </div>
              <div class="info-item">
                <label>结束类型:</label>
                <span :class="['tag', `end-type-${report.end_type || '主动结束'}`]">
                  {{ report.end_type || '主动结束' }}
                </span>
              </div>
              <div class="info-item">
                <label>会话时长:</label>
                <span>{{ formatDuration(getRealStartTime(report, chatMessages), getRealEndTime(report, chatMessages)) }}</span>
              </div>
              <div class="info-item">
                <label>风险等级:</label>
                <span :class="['tag', `risk-${report.risk}`]">
                  {{ report.risk }}
                </span>
              </div>
            </div>
            <div class="summary-section">
              <h4>报告摘要</h4>
              <p>{{ report.summary }}</p>
            </div>
          </div>
        </div>
        
        <!-- 情绪波动 -->
        <div v-if="activeTab === 'emotion'" class="tab-pane">
          <div v-if="isLoading" class="loading">加载中...</div>
          <div v-else class="emotion-chart-container">
            <div class="chart-header">
              <h4>情绪波动趋势</h4>
              <button class="export-btn" @click="exportChart">导出图表</button>
            </div>
            <div class="chart-wrapper">
              <canvas ref="emotionChart"></canvas>
            </div>
            <!-- 趋势分析 -->
            <div v-if="trendAnalysis" class="trend-analysis">
              <h5>趋势分析</h5>
              <p :class="['trend-text', trendAnalysis.trend]">{{ trendAnalysis.trendText }}</p>
              <p class="trend-summary">{{ trendAnalysis.summary }}</p>
            </div>
          </div>
        </div>
        
        <!-- 聊天记录 -->
        <div v-if="activeTab === 'chat'" class="tab-pane">
          <div v-if="isLoading" class="loading">加载�?..</div>
          <div v-else class="chat-records">
            <h4>聊天记录</h4>
            <div class="messages">
              <div 
                v-for="(msg, idx) in chatMessages" 
                :key="idx" 
                class="message" 
                :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
              >
                <div class="message-header">
                  <span class="message-role">{{ msg.role === 'user' ? '用户' : '助手' }}</span>
                  <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                  <!-- 显示情绪指数和标签 -->
                  <span v-if="msg.emotionData" class="emotion-tag">
                    情绪指数: {{ msg.emotionData.emotionIndex }}
                  </span>
                  <span v-if="msg.emotionData" :class="['risk-tag', `risk-${msg.emotionData.riskLevel}`]">
                    {{ msg.emotionData.riskLevel }}
                  </span>
                  <!-- 兼容旧数据 -->
                  <span v-else-if="msg.emotion" class="emotion-tag">情绪: {{ msg.emotion }}</span>
                  <span v-else-if="msg.risk" :class="['risk-tag', `risk-${msg.risk}`]">{{ msg.risk }}</span>
                </div>
                <div class="message-content">{{ msg.content }}</div>
                <!-- 显示情绪标签 -->
                <div v-if="msg.emotionData" class="emotion-detail">
                  <span class="emotion-label">{{ msg.emotionData.emotionLabel }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import axios from 'axios'
import Chart from 'chart.js/auto'
import { emotionIndexCalculator } from '../emotionIndexCalculator.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  report: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close'])

const activeTab = ref('basic')
const isLoading = ref(false)
const emotionChart = ref(null)
const chatMessages = ref([])
let chartInstance = null

const tabs = [
  { id: 'basic', name: '基本信息' },
  { id: 'emotion', name: '情绪波动' },
  { id: 'chat', name: '聊天记录' }
]

// 关闭弹窗
const close = () => {
  emit('close')
  // 清理图表实例
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

// 加载报告详情
const loadReportDetail = async () => {
  if (!props.report.id) return
  
  isLoading.value = true
  try {
    // 从报告数据中获取聊天记录
    if (props.report.text) {
      try {
        const reportData = JSON.parse(props.report.text)
        if (reportData.chat_history && Array.isArray(reportData.chat_history)) {
          chatMessages.value = reportData.chat_history.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            emotionData: msg.emotionData || null,
            // 兼容旧数据
            emotion: msg.emotion || null,
            risk: msg.risk || null
          }))
        } else {
          // 如果没有聊天记录，使用空数组
          chatMessages.value = []
        }
      } catch (parseError) {
        console.error('解析报告数据失败:', parseError)
        chatMessages.value = []
      }
    } else {
      chatMessages.value = []
    }
  } catch (error) {
    console.error('加载报告详情失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 获取用户消息的情绪数据
const getUserEmotionData = () => {
  return chatMessages.value
    .filter(msg => msg.role === 'user')
    .map((msg, index) => {
      // 如果已有情绪数据，直接使用
      if (msg.emotionData) {
        return {
          index: index + 1,
          ...msg.emotionData,
          content: msg.content
        }
      }
      // 否则，动态计算
      const emotionData = emotionIndexCalculator.calculateEmotionIndex(msg.content)
      return {
        index: index + 1,
        ...emotionData,
        content: msg.content
      }
    })
}

// 计算趋势分析
const getTrendAnalysis = (emotionData) => {
  return emotionIndexCalculator.analyzeTrend(emotionData)
}

// 趋势分析计算属性
const trendAnalysis = computed(() => {
  const emotionData = getUserEmotionData()
  if (emotionData.length < 2) return null
  return getTrendAnalysis(emotionData)
})

// 导出图表
const exportChart = () => {
  if (!chartInstance) return
  
  try {
    const link = document.createElement('a')
    link.download = `情绪报告_${new Date().toISOString().split('T')[0]}.png`
    link.href = emotionChart.value.toDataURL('image/png')
    link.click()
  } catch (error) {
    console.error('导出图表失败:', error)
    alert('导出图表失败，请重试')
  }
}

// 绘制情绪波动图表
const drawEmotionChart = () => {
  if (!emotionChart.value) return
  
  // 清理旧图表
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  // 获取真实情绪数据
  const emotionDataList = getUserEmotionData()
  
  // 如果没有数据，显示提示
  if (emotionDataList.length === 0) {
    const ctx = emotionChart.value.getContext('2d')
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#6c757d'
    ctx.textAlign = 'center'
    ctx.fillText('暂无情绪数据', emotionChart.value.width / 2, emotionChart.value.height / 2)
    return
  }
  
  // 准备图表数据
  const labels = emotionDataList.map((_, index) => `第${index + 1}轮`)
  const data = emotionDataList.map(item => item.emotionIndex)
  const riskLevels = emotionDataList.map(item => item.riskLevel)
  const emotionLabels = emotionDataList.map(item => item.emotionLabel)
  const contents = emotionDataList.map(item => 
    item.content.length > 20 ? item.content.substring(0, 20) + '...' : item.content
  )
  
  // 计算平均线
  const averageValue = data.reduce((a, b) => a + b, 0) / data.length
  
  const ctx = emotionChart.value.getContext('2d')
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '情绪指数',
          data: data,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: riskLevels.map(level => {
              if (level === '高') return '#dc3545'
              if (level === '中') return '#fd7e14'
              return '#28a745'
          }),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: '情绪基线',
          data: Array(data.length).fill(averageValue),
          borderColor: '#6c757d',
          borderDash: [5, 5],
          borderWidth: 1,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            beforeBody: function(context) {
              const index = context[0].dataIndex
              return [
                `情绪标签: ${emotionLabels[index]}`,
                `风险等级: ${riskLevels[index]}`,
                `消息片段: ${contents[index]}`
              ]
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          title: {
            display: true,
            text: '情绪指数 (越低越负面，0-10)'
          }
        }
      }
    }
  })
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '未知'
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 计算并格式化会话时长
const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return '未知'
  }
  
  const start = new Date(startTime)
  const end = new Date(endTime)
  const diffMs = end.getTime() - start.getTime()
  
  if (diffMs < 0) {
    return '未知'
  }
  
  const diffSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(diffSeconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天${hours % 24}小时${minutes % 60}分钟`
  } else if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟`
  } else {
    return `${diffSeconds}秒`
  }
}

// 获取真实的开始时间（优先从聊天记录获取）
const getRealStartTime = (report, chatMsgs) => {
  if (chatMsgs && chatMsgs.length > 0 && chatMsgs[0].timestamp) {
    return chatMsgs[0].timestamp
  }
  return report.start_time || report.time
}

// 获取真实的结束时间（优先从聊天记录获取）
const getRealEndTime = (report, chatMsgs) => {
  if (chatMsgs && chatMsgs.length > 0 && chatMsgs[chatMsgs.length - 1].timestamp) {
    return chatMsgs[chatMsgs.length - 1].timestamp
  }
  return report.end_time || report.time
}

// 监听报告变化
watch(() => props.report, () => {
  if (props.visible && props.report.id) {
    loadReportDetail()
  }
}, { deep: true })

// 监听可见性变化
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.report.id) {
    loadReportDetail()
  }
})

// 监听标签页变化
watch(activeTab, (newTab) => {
  if (newTab === 'emotion') {
    nextTick(() => {
      drawEmotionChart()
    })
  }
})

onMounted(() => {
  if (props.visible && props.report.id) {
    loadReportDetail()
  }
})
</script>

<style scoped>
.report-detail-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 250px !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(0, 0, 0, 0.5) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 1000 !important;
}

.report-detail-modal {
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.report-id {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 4px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  color: #6c757d;
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

.tab-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.tab-pane {
  height: 100%;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6c757d;
  font-size: 1rem;
}

.warning-banner {
  background: #fff3cd;
  color: #856404;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #ffeaa7;
  font-weight: 500;
  text-align: center;
}

.basic-info {
  height: 100%;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: 500;
}

.info-item span {
  font-size: 0.95rem;
  color: #495057;
  font-weight: 500;
}

.tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: bold;
  width: fit-content;
}

.end-type-主动结束 {
  background: #e3f2fd;
  color: #1976d2;
}

.end-type-异常退�?{
  background: #ffebee;
  color: #c62828;
}

.risk-�?{
  background: #e8f5e8;
  color: #2e7d32;
}

.risk-�?{
  background: #fff3e0;
  color: #ef6c00;
}

.risk-�?{
  background: #ffebee;
  color: #c62828;
}

.summary-section {
  margin-top: 30px;
}

.summary-section h4 {
  margin-bottom: 10px;
  color: #495057;
  font-size: 1.1rem;
}

.summary-section p {
  line-height: 1.6;
  color: #495057;
  font-size: 0.95rem;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.emotion-chart-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h4 {
  margin: 0;
  color: #495057;
  font-size: 1.1rem;
}

.export-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.chart-wrapper {
  flex: 1;
  min-height: 300px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.trend-analysis {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.trend-analysis h5 {
  margin: 0 0 10px 0;
  color: #1976d2;
  font-size: 1rem;
}

.trend-text {
  font-weight: bold;
  margin: 0 0 8px 0;
  font-size: 0.95rem;
}

.trend-text.improving {
  color: #28a745;
}

.trend-text.deteriorating {
  color: #dc3545;
}

.trend-text.stable {
  color: #fd7e14;
}

.trend-summary {
  margin: 0;
  color: #495057;
  font-size: 0.9rem;
  line-height: 1.5;
}

.chat-records {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-records h4 {
  margin-bottom: 20px;
  color: #495057;
  font-size: 1.1rem;
}

.messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.user-message {
  background: #e3f2fd;
  align-self: flex-end;
  border-bottom-right-radius: 0;
}

.assistant-message {
  background: #f8f9fa;
  align-self: flex-start;
  border-bottom-left-radius: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.8rem;
}

.message-role {
  font-weight: bold;
  color: #495057;
}

.message-time {
  color: #6c757d;
}

.emotion-tag {
  background: #e8f5e8;
  color: #2e7d32;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
}

.emotion-detail {
  margin-top: 8px;
}

.emotion-label {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.risk-tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
}

.risk-低 {
  background: #e8f5e8;
  color: #2e7d32;
}

.risk-中 {
  background: #fff3e0;
  color: #ef6c00;
}

.risk-高 {
  background: #ffebee;
  color: #c62828;
}

.message-content {
  line-height: 1.5;
  color: #495057;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .report-detail-modal {
    width: 95%;
    max-height: 90vh;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .tab-btn {
    padding: 10px 16px;
    font-size: 0.85rem;
  }
}
</style>
