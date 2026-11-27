<template>
  <div class="admin-dashboard">
    <div class="admin-container">
      <header class="admin-header">
        <div class="header-content">
          <h1>🔐 后台管理</h1>
          <p>系统管理和用户监控</p>
        </div>
        <button @click="handleLogout" class="logout-btn">
          退出管理
        </button>
      </header>

      <div class="admin-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'users' }" 
          @click="activeTab = 'users'"
        >
          👥 用户管理
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'posts' }" 
          @click="activeTab = 'posts'"
        >
          📝 帖子管理
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'settings' }" 
          @click="activeTab = 'settings'"
        >
          ⚙️ 匹配设置
        </button>
      </div>

      <!-- 用户管理 Tab -->
      <div v-if="activeTab === 'users'" class="admin-content">
        <div class="content-header">
          <h2>用户列表</h2>
          <button @click="loadUsers" class="refresh-btn">🔄 刷新</button>
        </div>
        
        <div v-if="loading" class="loading">加载中...</div>
        
        <div v-else-if="users.length === 0" class="empty">
          暂无用户数据
        </div>
        
        <div v-else class="user-list-container">
          <div class="user-list">
            <div 
              v-for="user in currentPageUsers" 
              :key="user.user_id" 
              class="user-card"
            >
              <div class="user-header">
                <div class="user-info">
                  <div class="user-avatar">
                    {{ user.user_id.charAt(0).toUpperCase() }}
                  </div>
                  <div class="user-details">
                    <div class="user-id">{{ user.user_id }}</div>
                    <div class="user-stats">
                      📊 {{ user.report_count }} 报告 | 📝 {{ user.post_count }} 帖子 | 💬 {{ user.comment_count }} 评论
                    </div>
                    <div v-if="user.last_activity" class="user-activity">
                      ⏰ 最后活动: {{ formatDate(user.last_activity) }}
                    </div>
                  </div>
                </div>
                <div class="user-actions">
                  <button 
                    @click="viewUserDetails(user.user_id)" 
                    class="btn btn-info"
                  >
                    查看详情
                  </button>
                  <button 
                    @click="confirmDeleteUser(user.user_id)" 
                    class="btn btn-danger"
                  >
                    删除用户
                  </button>
                </div>
              </div>
              
              <!-- 用户详情展开 -->
              <div v-if="expandedUser === user.user_id" class="user-details-expanded">
                <div class="details-tabs">
                  <button 
                    class="detail-tab-btn" 
                    :class="{ active: userDetailTab === 'logs' }"
                    @click="userDetailTab = 'logs'; loadUserLogs(user.user_id)"
                  >
                    操作日志
                  </button>
                  <button 
                    class="detail-tab-btn" 
                    :class="{ active: userDetailTab === 'reports' }"
                    @click="userDetailTab = 'reports'; loadUserReports(user.user_id)"
                  >
                    报告列表
                  </button>
                </div>
                
                <!-- 日志详情 -->
                <div v-if="userDetailTab === 'logs'" class="detail-content">
                  <div v-if="userLogs.length === 0" class="empty">暂无操作日志</div>
                  <div v-else class="logs-list">
                    <div v-for="log in userLogs" :key="log.id" class="log-item">
                      <div class="log-time">{{ formatDate(log.created_at) }}</div>
                      <div class="log-type">{{ log.action_type }}</div>
                      <div v-if="log.action_details" class="log-details">{{ log.action_details }}</div>
                    </div>
                  </div>
                </div>
                
                <!-- 报告详情 -->
                <div v-if="userDetailTab === 'reports'" class="detail-content">
                  <div v-if="userReports.length === 0" class="empty">暂无报告</div>
                  <div v-else class="reports-list">
                    <div v-for="report in userReports" :key="report.id" class="report-item">
                      <div class="report-header">
                        <span class="report-risk" :class="'risk-' + report.risk_level.toLowerCase()">
                          {{ report.risk_level }}
                        </span>
                        <span class="report-date">{{ formatDate(report.created_at) }}</span>
                        <span class="report-rounds">{{ report.conversation_rounds }} 轮对话</span>
                      </div>
                      <div class="report-summary">{{ report.summary }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 用户分页 -->
          <div v-if="totalUserPages > 1" class="pagination">
            <button 
              class="page-btn" 
              :disabled="userPage === 1" 
              @click="changeUserPage(userPage - 1)"
            >
              ← 上一页
            </button>
            <span class="page-info">第 {{ userPage }} 页 / 共 {{ totalUserPages }} 页</span>
            <button 
              class="page-btn" 
              :disabled="userPage === totalUserPages" 
              @click="changeUserPage(userPage + 1)"
            >
              下一页 →
            </button>
          </div>
        </div>
      </div>

      <!-- 帖子管理 Tab -->
      <div v-if="activeTab === 'posts'" class="admin-content">
        <div class="content-header">
          <h2>社区帖子管理</h2>
          <button @click="loadAdminPosts" class="refresh-btn">🔄 刷新</button>
        </div>
        
        <div v-if="loading" class="loading">加载中...</div>
        
        <div v-else-if="adminPosts.length === 0" class="empty">
          暂无帖子
        </div>
        
        <div v-else class="posts-list-container">
          <div class="posts-list">
            <div 
              v-for="post in currentPagePosts" 
              :key="post.id" 
              class="post-card"
            >
              <div class="post-header">
                <div class="post-author">
                  <span class="author-avatar">{{ post.author.charAt(0).toUpperCase() }}</span>
                  <span class="author-name">{{ post.author }}</span>
                </div>
                <div class="post-meta">
                  <span 
                    :style="{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      backgroundColor: post.category === 'share' ? '#e3f2fd' : 
                                     post.category === 'help' ? '#ffebee' : 
                                     post.category === 'advice' ? '#e8f5e8' : '#fff3e0',
                      color: post.category === 'share' ? '#1976d2' : 
                             post.category === 'help' ? '#c62828' : 
                             post.category === 'advice' ? '#2e7d32' : '#ef6c00'
                    }"
                  >
                    {{ post.category === 'share' ? '分享' : 
                       post.category === 'help' ? '求助' : 
                       post.category === 'advice' ? '建议' : '鼓励' }}
                  </span>
                  <span 
                    v-if="post.risk_level"
                    :style="{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      backgroundColor: post.risk_level === '低' ? '#e8f5e8' : 
                                     post.risk_level === '中' ? '#fff3e0' : '#ffebee',
                      color: post.risk_level === '低' ? '#2e7d32' : 
                             post.risk_level === '中' ? '#ef6c00' : '#c62828'
                    }"
                  >
                    {{ post.risk_level }}
                  </span>
                  <span class="post-date">{{ formatDate(post.created_at) }}</span>
                </div>
              </div>
              <div class="post-content">{{ post.content }}</div>
              <div class="post-actions">
                <button 
                  @click="deletePost(post.id)" 
                  class="btn btn-danger"
                >
                  删除帖子
                </button>
              </div>
            </div>
          </div>
          
          <!-- 帖子分页 -->
          <div v-if="totalPostPages > 1" class="pagination">
            <button 
              class="page-btn" 
              :disabled="postPage === 1" 
              @click="changePostPage(postPage - 1)"
            >
              ← 上一页
            </button>
            <span class="page-info">第 {{ postPage }} 页 / 共 {{ totalPostPages }} 页</span>
            <button 
              class="page-btn" 
              :disabled="postPage === totalPostPages" 
              @click="changePostPage(postPage + 1)"
            >
              下一页 →
            </button>
          </div>
        </div>
      </div>

      <!-- 匹配设置 Tab -->
      <div v-if="activeTab === 'settings'" class="admin-content">
        <div class="content-header">
          <h2>匹配设置</h2>
        </div>
        
        <div class="settings-section">
          <h3>用户识别匹配阈值</h3>
          <div class="setting-item">
            <div class="setting-label">当前阈值</div>
            <div class="setting-value">{{ (adminThreshold * 100).toFixed(0) }}%</div>
          </div>
          <div class="setting-item">
            <input 
              v-model.number="adminThreshold" 
              type="range" 
              min="0.75" 
              max="0.95" 
              step="0.01"
              class="threshold-slider"
            />
            <div class="threshold-range">
              <span>宽松 (75%)</span>
              <span>严格 (95%)</span>
            </div>
            <p class="setting-hint">
              {{ adminThreshold <= 0.8 ? '宽松模式' : adminThreshold <= 0.9 ? '标准模式' : '严格模式' }}
            </p>
          </div>
          <button 
            @click="saveThreshold" 
            :disabled="saving"
            class="btn btn-primary"
          >
            {{ saving ? '保存中...' : '保存设置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const emit = defineEmits(['logout'])

const activeTab = ref('users')
const loading = ref(false)
const saving = ref(false)

// 用户管理
const users = ref([])
const expandedUser = ref(null)
const userDetailTab = ref('logs')
const userLogs = ref([])
const userReports = ref([])
const userPage = ref(1)
const usersPerPage = ref(3)

// 帖子管理
const adminPosts = ref([])
const postPage = ref(1)
const postsPerPage = ref(3)

// 系统设置
const adminThreshold = ref(0.85)

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    const response = await axios.get('/admin/users')
    if (response.data.users) {
      users.value = response.data.users
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    alert('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 查看用户详情
const viewUserDetails = async (userId) => {
  if (expandedUser.value === userId) {
    expandedUser.value = null
  } else {
    expandedUser.value = userId
    userDetailTab.value = 'logs'
    await loadUserLogs(userId)
  }
}

// 加载用户日志
const loadUserLogs = async (userId) => {
  try {
    const response = await axios.get(`/admin/users/${userId}/logs`)
    if (response.data.logs) {
      userLogs.value = response.data.logs
    }
  } catch (error) {
    console.error('加载用户日志失败:', error)
  }
}

// 加载用户报告
const loadUserReports = async (userId) => {
  try {
    const response = await axios.get(`/admin/users/${userId}/reports`)
    if (response.data.reports) {
      userReports.value = response.data.reports
    }
  } catch (error) {
    console.error('加载用户报告失败:', error)
  }
}

// 确认删除用户
const confirmDeleteUser = (userId) => {
  if (confirm(`确定要删除用户 ${userId} 吗？此操作不可撤销！`)) {
    deleteUser(userId)
  }
}

// 删除用户
const deleteUser = async (userId) => {
  try {
    await axios.delete(`/admin/users/${userId}`)
    alert('用户已删除')
    await loadUsers()
    if (expandedUser.value === userId) {
      expandedUser.value = null
    }
  } catch (error) {
    console.error('删除用户失败:', error)
    alert('删除用户失败')
  }
}

// 加载帖子列表
const loadAdminPosts = async () => {
  loading.value = true
  try {
    const response = await axios.get('/community')
    if (response.data.posts) {
      adminPosts.value = response.data.posts
    }
  } catch (error) {
    console.error('加载帖子列表失败:', error)
    alert('加载帖子列表失败')
  } finally {
    loading.value = false
  }
}

// 删除帖子
const deletePost = async (postId) => {
  if (confirm('确定要删除该帖子吗？')) {
    try {
      const response = await axios.delete(`/community/posts/${postId}`)
      if (response.data.posts) {
        adminPosts.value = response.data.posts
      }
      alert('帖子已删除')
    } catch (error) {
      console.error('删除帖子失败:', error)
      alert('删除帖子失败')
    }
  }
}

// 加载阈值
const loadThreshold = async () => {
  try {
    const response = await axios.get('/admin/threshold')
    if (response.data.threshold) {
      adminThreshold.value = response.data.threshold
    }
  } catch (error) {
    console.error('加载阈值失败:', error)
  }
}

// 保存阈值
const saveThreshold = async () => {
  saving.value = true
  try {
    await axios.post('/admin/threshold', { threshold: adminThreshold.value })
    alert('阈值保存成功')
  } catch (error) {
    console.error('保存阈值失败:', error)
    alert('保存阈值失败')
  } finally {
    saving.value = false
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    return new Date(dateString).toLocaleString('zh-CN')
  } catch {
    return ''
  }
}

// 计算当前页用户
const currentPageUsers = computed(() => {
  const start = (userPage.value - 1) * usersPerPage.value
  const end = start + usersPerPage.value
  return users.value.slice(start, end)
})

// 用户总页数
const totalUserPages = computed(() => {
  return Math.ceil(users.value.length / usersPerPage.value)
})

// 计算当前页帖子
const currentPagePosts = computed(() => {
  const start = (postPage.value - 1) * postsPerPage.value
  const end = start + postsPerPage.value
  return adminPosts.value.slice(start, end)
})

// 帖子总页数
const totalPostPages = computed(() => {
  return Math.ceil(adminPosts.value.length / postsPerPage.value)
})

// 用户分页导航
const changeUserPage = (page) => {
  if (page >= 1 && page <= totalUserPages.value) {
    userPage.value = page
  }
}

// 帖子分页导航
const changePostPage = (page) => {
  if (page >= 1 && page <= totalPostPages.value) {
    postPage.value = page
  }
}

// 退出管理
const handleLogout = () => {
  emit('logout')
}

onMounted(() => {
  loadUsers()
  loadAdminPosts()
  loadThreshold()
})
</script>

<style scoped>
.admin-dashboard {
  width: 800px;
  height: 729px;
  padding: 0px 5px;
  margin: 0 5px;
}

.admin-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.admin-header {
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 1.8rem;
}

.header-content p {
  margin: 0;
  opacity: 0.9;
}

.logout-btn {
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.admin-tabs {
  display: flex;
  padding: 20px 30px;
  background: #f8f9fa;
  gap: 10px;
}

.tab-btn {
  padding: 10px 24px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 24px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  transition: all 0.3s;
}

.tab-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.admin-content {
  padding: 30px;
  display: flex;
  flex-direction: column;
  height: calc(729px - 150px);
  box-sizing: border-box;
}

.user-list-container,
.posts-list-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.user-list,
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  padding-right: 8px;
}

.user-list::-webkit-scrollbar,
.posts-list::-webkit-scrollbar {
  width: 6px;
}

.user-list::-webkit-scrollbar-track,
.posts-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.user-list::-webkit-scrollbar-thumb,
.posts-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.user-list::-webkit-scrollbar-thumb:hover,
.posts-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.content-header h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #343a40;
}

.refresh-btn {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.3s;
}

.refresh-btn:hover {
  background: #5a6268;
}

.loading,
.empty {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.user-list,
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card,
.post-card {
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  background: white;
  transition: box-shadow 0.3s;
}

.user-card:hover,
.post-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.user-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
}

.user-id {
  font-weight: bold;
  font-size: 1.1rem;
  color: #343a40;
  margin-bottom: 4px;
}

.user-stats {
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 4px;
}

.user-activity {
  font-size: 0.85rem;
  color: #adb5bd;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.user-details-expanded {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.details-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-tab-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

.detail-tab-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.detail-content {
  max-height: 400px;
  overflow-y: auto;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.log-time {
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 4px;
}

.log-type {
  font-weight: bold;
  color: #343a40;
  margin-bottom: 4px;
}

.log-details {
  font-size: 0.9rem;
  color: #495057;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-item {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.report-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.report-risk {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: bold;
}

.report-risk.risk-高 {
  background: #ffebee;
  color: #c62828;
}

.report-risk.risk-中 {
  background: #fff3e0;
  color: #ef6c00;
}

.report-risk.risk-低 {
  background: #e8f5e8;
  color: #2e7d32;
}

.report-date,
.report-rounds {
  font-size: 0.85rem;
  color: #6c757d;
}

.report-summary {
  color: #343a40;
  line-height: 1.5;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.author-name {
  font-weight: bold;
  color: #343a40;
}

.post-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.post-date {
  font-size: 0.85rem;
  color: #6c757d;
}

.post-content {
  color: #343a40;
  line-height: 1.6;
  margin-bottom: 16px;
}

.post-actions {
  display: flex;
  justify-content: flex-end;
}

.settings-section {
  max-width: 600px;
}

.settings-section h3 {
  margin-bottom: 24px;
  font-size: 1.3rem;
  color: #343a40;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-label {
  font-weight: bold;
  color: #495057;
  margin-bottom: 8px;
}

.setting-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 12px;
}

.threshold-slider {
  width: 100%;
  margin-bottom: 8px;
}

.threshold-range {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #6c757d;
}

.setting-hint {
  margin-top: 8px;
  font-size: 0.95rem;
  color: #17a2b8;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  margin-top: 12px;
  border-top: 1px solid #e9ecef;
}

.page-btn {
  padding: 8px 20px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #adb5bd;
  color: #343a40;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.95rem;
  color: #495057;
  font-weight: 500;
}
</style>