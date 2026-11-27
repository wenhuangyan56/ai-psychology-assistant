<template>
  <div class="report-list">
    <div class="report-header">
      <div class="search-bar">
        <input 
          v-model="searchKeyword" 
          type="text" 
          :placeholder="t('searchReport')"
          class="search-input"
        >
        <button @click="searchReports" class="search-btn">{{ t('search') }}</button>
      </div>
      <div class="filter-bar">
        <select v-model="filterRiskLevel" class="filter-select">
          <option value="">{{ t('allRiskLevels') }}</option>
          <option value="低">{{ t('lowRisk') }}</option>
          <option value="中">{{ t('mediumRisk') }}</option>
          <option value="高">{{ t('highRisk') }}</option>
        </select>
        <select v-model="sortOrder" class="filter-select">
          <option value="desc">{{ t('sortByTimeDesc') }}</option>
          <option value="asc">{{ t('sortByTimeAsc') }}</option>
        </select>
      </div>
    </div>

    <div class="report-content-container">
      <div v-if="isLoading" class="loading-container">
        <div v-for="i in 4" :key="i" class="skeleton-card">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>

      <div v-else class="report-cards">
        <div
          v-for="report in paginatedReports"
          :key="report.id"
          class="report-card"
          @click="viewReport(report)"
        >
          <div class="report-header-info">
            <div class="report-time">{{ formatTime(report.time) }}</div>
            <div class="report-tags">
              <span :class="['tag', `end-type-${report.end_type || 'activeEnd'}`]">
                {{ report.end_type || t('activeEnd') }}
              </span>
              <span :class="['tag', `risk-${report.risk}`]">
                {{ report.risk }}
              </span>
            </div>
          </div>
          <div class="report-content">
            <div class="report-summary">{{ report.summary.substring(0, 50) }}...</div>
            <div class="report-meta">
              <span class="session-duration">{{ t('sessionDuration') }}: {{ formatDuration(report) }}</span>
              <span v-if="report.conversation_rounds" class="round-count">
                {{ t('rounds') }}: {{ report.conversation_rounds }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="reports.length === 0" class="empty-state">
          <p>{{ t('noReports') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { t } = useI18n()

const props = defineProps({
  userId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['view-report', 'update:totalReports', 'update:currentPage'])

const reports = ref([])
const isLoading = ref(false)
const searchKeyword = ref('')
const filterRiskLevel = ref('')
const sortOrder = ref('desc')
const currentPageNum = ref(1)
const pageSize = 4

const MIN_ROUNDS_FOR_DISPLAY = 5

const totalPages = computed(() => Math.ceil(reports.value.length / pageSize))

const paginatedReports = computed(() => {
  const start = (currentPageNum.value - 1) * pageSize
  const end = start + pageSize
  return reports.value.slice(start, end)
})

const loadReports = async () => {
  isLoading.value = true
  console.log('开始加载报告，userId:', props.userId)
  try {
    const response = await axios.get('/reports', {
      params: {
        user_id: props.userId,
        risk_level: filterRiskLevel.value,
        sort_order: sortOrder.value,
        keyword: searchKeyword.value,
        min_rounds: MIN_ROUNDS_FOR_DISPLAY
      }
    })
    console.log('API返回数据:', response.data)
    reports.value = response.data.filter(report => {
      if (report.conversation_rounds !== undefined) {
        return report.conversation_rounds >= MIN_ROUNDS_FOR_DISPLAY
      }
      return true
    })
    currentPageNum.value = 1
    console.log('报告加载完成，数量', reports.value.length)
    
    emit('update:totalReports', reports.value.length)
    emit('update:currentPage', currentPageNum.value)
  } catch (error) {
    console.error('加载报告失败:', error)
    reports.value = []
  } finally {
    isLoading.value = false
  }
}

// 暴露给父组件的分页方法
const setCurrentPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPageNum.value = page
    emit('update:currentPage', currentPageNum.value)
  }
}

const exportAllReports = () => {
  const dataStr = JSON.stringify(reports.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reports_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const deleteAllReports = async () => {
  if (!confirm(t('confirmDeleteAllReports'))) return
  try {
    await axios.post('/reports/clear', { user_id: props.userId })
    reports.value = []
    emit('update:totalReports', 0)
  } catch (error) {
    console.error('删除报告失败:', error)
  }
}

const viewReport = (report) => {
  emit('view-report', report)
}

const searchReports = () => {
  loadReports()
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const formatDuration = (report) => {
  if (!report.start_time || !report.end_time) return t('unknown')
  const start = new Date(report.start_time)
  const end = new Date(report.end_time)
  const diff = Math.floor((end - start) / 1000)
  if (diff < 60) return `${diff}秒`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟`
  return `${Math.floor(diff / 3600)}小时${Math.floor((diff % 3600) / 60)}分钟`
}

onMounted(() => {
  loadReports()
})

// 监听筛选条件和排序变化
watch([filterRiskLevel, sortOrder, searchKeyword], () => {
  loadReports()
})

watch(() => props.userId, () => {
  loadReports()
})

// 暴露方法给父组件
defineExpose({
  setCurrentPage
})
</script>

<style scoped>
.report-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  gap: 16px;
}

.search-bar {
  display: flex;
  gap: 8px;
  flex: 1;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
}

.search-btn {
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.filter-bar {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
}

.report-content-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.skeleton-line {
  height: 16px;
  background: #e5e7eb;
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-line:last-child {
  width: 60%;
}

.report-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-card {
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.report-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.report-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.report-time {
  font-size: 12px;
  color: #6b7280;
}

.report-tags {
  display: flex;
  gap: 8px;
}

.tag {
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.tag.end-type-主动结束 {
  background: #dcfce7;
  color: #16a34a;
}

.tag.risk-低 {
  background: #dcfce7;
  color: #16a34a;
}

.tag.risk-中 {
  background: #fef3c7;
  color: #d97706;
}

.tag.risk-高 {
  background: #fee2e2;
  color: #dc2626;
}

.report-content {
  margin-top: 12px;
}

.report-summary {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.5;
}

.report-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px;
  color: #9ca3af;
}
</style>