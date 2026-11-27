<template>
  <div class="template-manager">
    <h3>用户识别管理</h3>
    
    <div class="section">
      <h4>匹配阈值设置</h4>
      <div class="threshold-control">
        <label>匹配阈值: {{ matchingThreshold.toFixed(2) }}</label>
        <input 
          type="range" 
          v-model.number="matchingThreshold" 
          min="0.75" 
          max="0.95" 
          step="0.01"
          @change="updateThreshold"
        />
        <div class="threshold-labels">
          <span>宽松 (0.75)</span>
          <span>严格 (0.95)</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h4>模板列表 ({{ templates.length }}/{{ maxTemplates }})</h4>
      <div v-if="templates.length === 0" class="empty-state">
        <p>暂无用户模板</p>
      </div>
      <div v-else class="template-list">
        <div 
          v-for="template in templates" 
          :key="template.id" 
          class="template-item"
          :class="{ active: isCurrentMatch(template.id) }"
        >
          <div class="template-info">
            <div class="template-header">
              <span class="template-id">{{ template.id.slice(0, 8) }}...</span>
              <span v-if="isCurrentMatch(template.id)" class="current-tag">当前匹配</span>
            </div>
            <div class="template-meta">
              <span>创建: {{ formatDate(template.createdAt) }}</span>
              <span>最后使用: {{ formatDate(template.lastUsedAt) }}</span>
            </div>
            <div class="template-preferences">
              <span>共情: {{ getEmpathyLabel(template.preferences.empathyStyle) }}</span>
              <span>语言: {{ template.preferences.language === 'zh' ? '中文' : '英文' }}</span>
              <span>主题: {{ template.preferences.theme === 'light' ? '明亮' : '暗黑' }}</span>
            </div>
            <div v-if="template.contextSummary" class="template-summary">
              <span class="summary-label">上下文摘要:</span>
              <span class="summary-text">{{ template.contextSummary }}</span>
            </div>
          </div>
          <div class="template-actions">
            <button 
              class="btn btn-danger" 
              @click="deleteTemplateItem(template.id)"
              :disabled="isCurrentMatch(template.id)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h4>数据管理</h4>
      <div class="action-buttons">
        <button class="btn btn-primary" @click="exportAllTemplates">
          导出模板
        </button>
        <button class="btn btn-secondary" @click="triggerImport">
          导入模板
        </button>
        <button class="btn btn-warning" @click="clearAllTemplates">
          清空所有模板
        </button>
        <button class="btn btn-danger" @click="resetAllData">
          重置所有识别数据
        </button>
      </div>
      <input 
        ref="importInput"
        type="file" 
        accept=".json" 
        class="import-file-input"
        @change="handleFileImport"
      />
    </div>

    <div class="section">
      <h4>当前状态</h4>
      <div class="status-info">
        <div class="status-item">
          <span class="status-label">识别状态:</span>
          <span class="status-value">{{ stateDescription }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">对话轮次:</span>
          <span class="status-value">{{ conversationRounds }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">匹配置信度:</span>
          <span class="status-value">{{ matchConfidence.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>import { ref, onMounted, watch, nextTick } from 'vue';
import { initUserRecognition, getAllTemplates, deleteTemplate, exportTemplates, importTemplates, clearLocalData, getStateDescription, setMatchingThreshold, userRecognition, registerStateChangeCallback } from '../stores/userRecognition';
import { templateLibrary } from '../utils/templateLibrary';
const templates = ref([]);
const matchingThreshold = ref(0.85);
const importInput = ref(null);
const maxTemplates = 10;
const conversationRounds = ref(0);
const matchConfidence = ref(0);
const stateDescription = ref('');
let unsubscribeStateChange = null;
function loadTemplates() {
 templates.value = getAllTemplates();
}
function deleteTemplateItem(id) {
 if (confirm('确定要删除这个模板吗？')) {
 deleteTemplate(id);
 loadTemplates();
 }
}
function isCurrentMatch(templateId) {
 return userRecognition.currentMatchId === templateId;
}
function formatDate(timestamp) {
 const date = new Date(timestamp);
 return date.toLocaleString('zh-CN', {
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 });
}
function getEmpathyLabel(style) {
 const labels = { warm: '温暖', professional: '专业', concise: '简洁' };
 return labels[style] || style;
}
function exportAllTemplates() {
 const data = exportTemplates();
 const blob = new Blob([data], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `user-templates-${Date.now()}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 alert('模板已导出');
}
function triggerImport() {
 importInput.value?.click();
}
function handleFileImport(event) {
 const file = event.target.files?.[0];
 if (!file)
 return;
 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const result = importTemplates(e.target.result);
 if (result.success) {
 alert(`成功导入 ${result.count} 个模板`);
 loadTemplates();
 }
 else {
 alert(`导入失败: ${result.error}`);
 }
 }
 catch (error) {
 alert('导入失败: ' + error.message);
 }
 };
 reader.readAsText(file);
 event.target.value = '';
}
function clearAllTemplates() {
 if (confirm('确定要清空所有模板吗？此操作不可恢复。')) {
 templateLibrary.clearAll();
 loadTemplates();
 alert('所有模板已清空');
 }
}
function resetAllData() {
 if (confirm('确定要重置所有识别数据吗？这将清除所有模板和识别状态，回到初始状态。')) {
 clearLocalData();
 loadTemplates();
 matchingThreshold.value = 0.85;
 alert('所有识别数据已重置');
 }
}
function updateThreshold() {
 setMatchingThreshold(matchingThreshold.value);
}
function updateStatus() {
 conversationRounds.value = userRecognition.conversationRounds;
 matchConfidence.value = userRecognition.matchConfidence;
 stateDescription.value = getStateDescription(userRecognition.state);
}
onMounted(() => {
 initUserRecognition();
 loadTemplates();
 updateStatus();
 // 注册状态变化回调
 unsubscribeStateChange = registerStateChangeCallback(() => {
 updateStatus();
 loadTemplates();
 });
 // 监听模板库变化
 watch(() => userRecognition, () => {
 loadTemplates();
 updateStatus();
 }, { deep: true });
});
</script>

<style scoped>
.template-manager {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.section {
  margin-bottom: 30px;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.section h4 {
  margin: 0 0 15px 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.threshold-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.threshold-control label {
  font-weight: 500;
  color: var(--text-secondary);
}

.threshold-control input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--border-color);
  outline: none;
}

.threshold-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  background: var(--background);
  border-radius: 8px;
  border: 2px solid transparent;
}

.template-item.active {
  border-color: var(--primary-color);
  background: rgba(var(--primary-color-rgb), 0.05);
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.template-id {
  font-family: monospace;
  font-size: 14px;
  color: var(--text-primary);
}

.current-tag {
  padding: 2px 8px;
  background: var(--primary-color);
  color: white;
  font-size: 12px;
  border-radius: 4px;
}

.template-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.template-preferences {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: var(--text-secondary);
}

.template-summary {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.summary-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 8px;
}

.summary-text {
  font-size: 13px;
  color: var(--text-primary);
  font-style: italic;
}

.template-actions {
  margin-left: 15px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border-hover);
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.import-file-input {
  display: none;
}

.status-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: var(--background);
  border-radius: 6px;
}

.status-label {
  color: var(--text-muted);
  font-size: 13px;
}

.status-value {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 13px;
}
</style>
