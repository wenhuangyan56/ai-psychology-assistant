<template>
  <div id="app">
    <div class="app-container">
      <!-- 侧边导航栏 -->
      <div class="sidebar" style="position: relative; z-index: 9999999; pointer-events: auto;">
        <div class="logo">
          <h2>{{ $t('title') }}</h2>
        </div>
        <div class="nav-menu" style="position: relative; z-index: 9999999; pointer-events: auto;">
          <div 
            class="nav-item" 
            :class="{ 'active': currentPage === 'chat' }"
            @click="navigateTo('chat')"
            style="position: relative; z-index: 99999999; pointer-events: auto; cursor: pointer;"
          >
            <span></span>
            <span>{{ $t('chat') }}</span>
          </div>
          <div 
            class="nav-item" 
            :class="{ 'active': currentPage === 'reports' }"
            @click="navigateTo('reports')"
            style="position: relative; z-index: 99999999; pointer-events: auto; cursor: pointer;"
          >
            <span></span>
            <span>{{ $t('reports') }}</span>
          </div>
          <div 
            class="nav-item" 
            :class="{ 'active': currentPage === 'community' }"
            @click="navigateTo('community')"
            style="position: relative; z-index: 99999999; pointer-events: auto; cursor: pointer;"
          >
            <span></span>
            <span>{{ $t('community') }}</span>
          </div>
          <div 
            class="nav-item" 
            :class="{ 'active': currentPage === 'settings' }"
            @click="navigateTo('settings')"
            style="position: relative; z-index: 99999999; pointer-events: auto; cursor: pointer;"
          >
            <span></span>
            <span>{{ $t('settings') }}</span>
          </div>
          <div 
            v-if="adminAuthenticated"
            class="nav-item" 
            :class="{ 'active': currentPage === 'admin' }"
            @click="navigateTo('admin')"
            style="position: relative; z-index: 99999999; pointer-events: auto; cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2); color: white;"
          >
            <span>🔐</span>
            <span>后台管理</span>
          </div>
        </div>
      </div>
      
      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 聊天对话页面 -->
        <div v-if="currentPage === 'chat'" class="chat-main">
          <div class="container">
            <header>
              <h1>{{ $t('title') }}</h1>
              <p>{{ $t('welcome') }}</p>
              <div v-if="isUserIdentified" class="user-info">✅ 欢迎回来！已识别您的身份</div>
              <div v-else-if="userRecognition.state === 'silent_collection'" class="user-info">🔍 正在收集行为特征... ({{ userRecognition.conversationRounds }}/5)</div>
              <div v-else-if="userRecognition.state === 'matching_attempt'" class="user-info">🤔 正在尝试识别您的身份...</div>
            </header>
            <div class="chat-container" ref="chatContainer">
              <div class="messages">
                <div 
                  v-for="(msg, idx) in messages" 
                  :key="idx" 
                  class="message" 
                  :class="msg.role === 'user' ? 'user-message' : 'assistant-message'"
                >
                  <div v-if="msg.isHtml" v-html="msg.content"></div>
                  <template v-else>
                    <span v-if="getRiskTag(msg.content)" class="risk-tag" :class="getRiskClass(msg.content)">{{ getRiskTag(msg.content) }}</span>
                    <span>{{ removeRiskTag(msg.content) }}</span>
                  </template>
                  <div class="timestamp">{{ msg.timestamp }}</div>
                  <div v-if="msg.usedModel" class="model-badge">{{ msg.usedModel }}</div>
                </div>
                <div v-if="isLoading" class="message assistant-message">
                  <span>{{ $t('thinking') }}</span>
                </div>
              </div>
            </div>
            <div class="input-area">
              <div class="input-options">
                <button class="input-expand-btn" @click="toggleInputExpand">
                  {{ isInputExpanded ? '▼' : '▲' }}
                </button>
              </div>
              <div class="input-wrapper">
                <textarea 
                  v-model="inputText" 
                  @keydown.enter.ctrl="handleSend"
                  @focus="handleInputFocus"
                  @input="handleInputChange"
                  :placeholder="$t('inputPlaceholder')"
                  :rows="isInputExpanded ? 12 : 3"
                  class="expandable-textarea"
                ></textarea>
                <!-- <button class="voice-btn" @click="toggleVoiceInput" :disabled="isLoading">
                  {{ isRecording ? '停止' : '录音' }}
                </button> -->
              </div>
              <div class="controls">
                <select v-model="currentModel" :disabled="isLoading">
                  <option value="auto">{{ $t('autoSelect') }}</option>
                  <option value="DeepSeek">DeepSeek</option>
                  <option value="通义千问">通义千问</option>
                  <option value="智谱 AI">智谱 AI</option>
                </select>
                <button @click="handleSend" :disabled="isLoading || !inputText.trim()">
                  {{ isLoading ? $t('sending') : $t('send') }}
                </button>
                <button @click="cancelChat" :disabled="!isLoading" class="warning">
                  {{ $t('cancel') }}
                </button>
                <button @click="handleEndSession" class="danger" :disabled="isLoading">
                  {{ $t('endSession') }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 报告中心页面 -->
        <div v-if="currentPage === 'reports'" class="page-content">
          <div class="container">
            <header>
              <h1>{{ $t('reportsTitle') }}</h1>
              <p>{{ $t('reportsSubtitle') }}</p>
            </header>
            <div class="page-body">
              <ReportList 
                ref="reportListRef"
                :userId="userId" 
                @view-report="viewReport"
                @update:totalReports="totalReports = $event"
                @update:currentPage="currentPageNum = $event"
              />
            </div>
            <!-- 分页 -->
            <div v-if="totalReports > 0" class="pagination">
              <button 
                @click="changePage(currentPageNum - 1)" 
                :disabled="currentPageNum === 1"
                class="page-btn"
              >
                {{ $t('previousPage') }}
              </button>
              <span class="page-info">{{ $t('pageInfo', { current: currentPageNum, total: Math.ceil(totalReports / pageSize) }) }}</span>
              <button 
                @click="changePage(currentPageNum + 1)" 
                :disabled="currentPageNum >= Math.ceil(totalReports / pageSize)"
                class="page-btn"
              >
                {{ $t('nextPage') }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 社区页面 -->
        <div v-if="currentPage === 'community'" class="page-content">
          <div class="container">
            <header>
              <h1>{{ $t('communityTitle') }}</h1>
              <p>{{ $t('communitySubtitle') }}</p>
            </header>
            <div class="page-body">
              <!-- 发布新帖子 -->
              <div class="post-create" style="margin-bottom: 20px; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);">
                <h4 style="margin-bottom: 16px; color: #495057;">{{ $t('createNewPost') }}</h4>
                <textarea 
                  v-model="newPostContent" 
                  :placeholder="$t('shareYourStory')" 
                  style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 0.9rem; resize: vertical; min-height: 100px; font-family: inherit; margin-bottom: 12px;"
                ></textarea>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <select v-model="newPostCategory" style="padding: 8px 16px; border: 2px solid #e9ecef; border-radius: 24px; font-size: 0.9rem;">
                    <option value="share">{{ $t('share') }}</option>
                    <option value="help">{{ $t('help') }}</option>
                    <option value="advice">{{ $t('advice') }}</option>
                    <option value="encouragement">{{ $t('encouragement') }}</option>
                  </select>
                  <button @click="createPost" :disabled="!newPostContent.trim()" style="padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 24px; cursor: pointer; font-size: 0.9rem; box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);">
                    {{ $t('post') }}
                  </button>
                </div>
              </div>
              
              <!-- 社区帖子列表 -->
              <div class="community-posts">
                <div 
                  v-for="post in communityPosts" 
                  :key="post.id" 
                  class="community-post" 
                  style="background: white; border: 1px solid #e9ecef; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);"
                >
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: bold;">
                        {{ post.author.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <div style="font-size: 0.95rem; font-weight: bold;">{{ post.author }}</div>
                        <div style="font-size: 0.75rem; color: #6c757d;">{{ new Date(post.createdAt).toLocaleString() }}</div>
                      </div>
                    </div>
                    <span :style="{ 
                      padding: '4px 12px', 
                      borderRadius: '16px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      backgroundColor: post.category === 'share' ? '#e3f2fd' : 
                                    post.category === 'help' ? '#ffebee' : 
                                    post.category === 'advice' ? '#e8f5e8' : '#fff3e0',
                      color: post.category === 'share' ? '#1976d2' : 
                             post.category === 'help' ? '#c62828' : 
                             post.category === 'advice' ? '#2e7d32' : '#ef6c00'
                    }">
                      {{ post.category === 'share' ? $t('share') : 
                         post.category === 'help' ? $t('help') : 
                         post.category === 'advice' ? $t('advice') : $t('encouragement') }}
                    </span>
                  </div>
                  <div style="margin-bottom: 12px; font-size: 0.95rem; line-height: 1.5;">
                    {{ post.content }}
                  </div>
                  <div style="display: flex; gap: 20px; font-size: 0.85rem;">
                    <button 
                      @click="toggleComments(post.id)" 
                      style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; color: #6c757d; transition: all 0.3s ease;"
                    >
                      💬 {{ post.comments.length }} 评论
                    </button>
                  </div>
                  <!-- 评论区 -->
                  <div v-if="post.showComments" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e9ecef;">
                    <div v-for="comment in post.comments" :key="comment.id" style="margin-bottom: 12px; font-size: 0.85rem; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                      <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                          {{ comment.author.charAt(0).toUpperCase() }}
                        </div>
                        <div style="flex: 1;">
                          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                            <span style="font-weight: bold; font-size: 0.8rem;">{{ comment.author }}</span>
                            <span v-if="comment.createdAt" style="font-size: 0.65rem; color: #6c757d;">
                              {{ new Date(comment.createdAt).toLocaleString() }}
                            </span>
                          </div>
                          <div style="margin-top: 4px;">{{ comment.content }}</div>
                        </div>
                      </div>
                    </div>
                    <div style="margin-top: 12px; display: flex; gap: 10px;">
                      <input 
                        v-model="post.newComment" 
                        :placeholder="$t('writeComment')" 
                        style="flex: 1; padding: 8px 12px; border: 2px solid #e9ecef; border-radius: 24px; font-size: 0.85rem;"
                      >
                      <button 
                        @click="addComment(post.id)" 
                        :disabled="!post.newComment?.trim()" 
                        style="padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 24px; cursor: pointer; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);"
                      >
                        {{ $t('sendComment') }}
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="communityPosts.length === 0" class="history-empty">{{ $t('noReports') }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 设置页面 -->
        <div v-if="currentPage === 'settings'" class="page-content">
          <div class="container">
            <header>
              <h1>{{ $t('settingsTitle') }}</h1>
              <p>{{ $t('settingsSubtitle') }}</p>
            </header>
            <div class="page-body">
              <div class="settings-container" style="background: var(--card-bg); padding: 24px; border-radius: 10px; box-shadow: 0 2px 10px var(--shadow-color);">
                
                <!-- 个性化设置组 -->
                <div class="settings-section" style="margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid var(--border-color);">
                  <h3 style="margin-bottom: 24px; color: var(--accent-color); font-size: 1.2rem; font-weight: bold;">{{ $t('personalSettings') }}</h3>
                  
                  <div class="setting-item" style="margin-bottom: 30px;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('empathyStyle') }}</h4>
                    <select v-model="empathyStyle" style="width: 100%; padding: 12px; border: 2px solid var(--border-color); border-radius: 24px; font-size: 0.95rem; background: var(--bg-secondary); color: var(--text-primary);">
                      <option value="warm">{{ $t('warmSupportive') }}</option>
                      <option value="professional">{{ $t('professionalGuidance') }}</option>
                      <option value="concise">{{ $t('conciseDirect') }}</option>
                    </select>
                  </div>
                  
                  <div class="setting-item" style="margin-bottom: 30px;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('themeSetting') }}</h4>
                    <select v-model="theme" @change="handleThemeChange" style="width: 100%; padding: 12px; border: 2px solid var(--border-color); border-radius: 24px; font-size: 0.95rem; background: var(--bg-secondary); color: var(--text-primary);">
                      <option value="light">{{ $t('lightMode') }}</option>
                      <option value="dark">{{ $t('darkMode') }}</option>
                    </select>
                  </div>
                  
                  <div class="setting-item" style="margin-bottom: 30px;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('fontSize') }}</h4>
                    <select v-model="fontSize" @change="handleFontSizeChange" style="width: 100%; padding: 12px; border: 2px solid var(--border-color); border-radius: 24px; font-size: 0.95rem; background: var(--bg-secondary); color: var(--text-primary);">
                      <option value="small">{{ $t('small') }}</option>
                      <option value="medium">{{ $t('medium') }}</option>
                      <option value="large">{{ $t('large') }}</option>
                    </select>
                  </div>
                </div>
                
                <!-- 语言与地区组 -->
                <div class="settings-section" style="margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid var(--border-color);">
                  <h3 style="margin-bottom: 24px; color: var(--accent-color); font-size: 1.2rem; font-weight: bold;">{{ $t('languageRegion') }}</h3>
                  
                  <div class="setting-item">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('languageSetting') }}</h4>
                    <select v-model="locale" style="width: 100%; padding: 12px; border: 2px solid var(--border-color); border-radius: 24px; font-size: 0.95rem; background: var(--bg-secondary); color: var(--text-primary);">
                      <option value="zh-CN">{{ $t('simplifiedChinese') }}</option>
                      <option value="en-US">{{ $t('english') }}</option>
                    </select>
                  </div>
                </div>
                
                <!-- 数据管理组 -->
                <div class="settings-section" style="margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid var(--border-color);">
                  <h3 style="margin-bottom: 24px; color: var(--accent-color); font-size: 1.2rem; font-weight: bold;">{{ $t('dataManagement') }}</h3>
                  
                  <!-- <div class="setting-item" style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('dataExport') }}</h4>
                    <button @click="exportAllData" style="padding: 12px 24px; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; border: none; border-radius: 24px; cursor: pointer; font-size: 0.95rem; box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);">
                      {{ $t('exportData') }}
                    </button>
                  </div> -->
                  
                  <div class="setting-item">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('dataClear') }}</h4>
                    <button @click="clearAllData" style="padding: 12px 24px; background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; border: none; border-radius: 24px; cursor: pointer; font-size: 0.95rem; box-shadow: 0 2px 6px rgba(244, 67, 54, 0.3);">
                      {{ $t('clearAllData') }}
                    </button>
                  </div>
                </div>
                
                <!-- 帮助与关于组 -->
                <div class="settings-section" style="margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid var(--border-color);">
                  <h3 style="margin-bottom: 24px; color: var(--accent-color); font-size: 1.2rem; font-weight: bold;">{{ $t('helpSupport') }}</h3>
                  
                  <div class="setting-item" style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('usageTutorial') }}</h4>
                    <button @click="showTutorial = true" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 24px; cursor: pointer; font-size: 0.95rem; box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);">
                      {{ $t('viewTutorial') }}
                    </button>
                  </div>
                  
                  <div class="setting-item" style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('faq') }}</h4>
                    <button @click="showFAQ = true" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 24px; cursor: pointer; font-size: 0.95rem; box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);">
                      {{ $t('viewFaq') }}
                    </button>
                  </div>
                  
                  <div class="setting-item">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary); font-size: 1.1rem;">{{ $t('contactDeveloper') }}</h4>
                    <button @click="showContact = true" style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 24px; cursor: pointer; font-size: 0.95rem; box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);">
                      {{ $t('contactUs') }}
                    </button>
                  </div>
                </div>
                

                
                <!-- About App -->
                <div class="settings-section">
                  <h3 style="margin-bottom: 24px; color: var(--accent-color); font-size: 1.2rem; font-weight: bold;">{{ $t('aboutApp') }}</h3>
                  
                  <div class="setting-item">
                    <p style="font-size: 1rem; color: var(--text-primary); margin-bottom: 8px; font-weight: bold;">{{ $t('appName') }}</p>
                    <p 
                      style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px; cursor: pointer;" 
                      @click="handleVersionClick"
                    >
                      {{ $t('version') }}
                    </p>
                    <p style="font-size: 0.9rem; color: var(--text-secondary);">{{ $t('appDescription') }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 后台管理页面 -->
        <div v-if="currentPage === 'admin' && adminAuthenticated" class="page-content">
          <AdminDashboard @logout="handleAdminLogout" />
        </div>
      </div>
    </div>
    
    <!-- 管理员认证弹窗 -->
    <div v-if="showAdminAuthModal" class="modal-overlay" @click="showAdminAuthModal = false">
      <div class="modal-content admin-auth-modal" @click.stop>
        <div class="modal-header">
          <h2>🔐 管理员认证</h2>
          <button class="close-btn" @click="showAdminAuthModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="auth-form">
            <label for="admin-password">请输入管理员密码</label>
            <input 
              id="admin-password"
              v-model="adminPassword" 
              type="password" 
              placeholder="输入密码"
              @keyup.enter="verifyAdminPasswordWithModal"
            />
            <p v-if="adminPasswordError" class="error-message">{{ adminPasswordError }}</p>
            <button 
              @click="verifyAdminPasswordWithModal"
              class="submit-btn"
            >
              验证并进入后台
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 报告详情弹窗 -->
    <ReportDetail 
      :visible="showReportDetail" 
      :report="selectedReport" 
      @close="closeReportDetail" 
    />
    
    <!-- 使用教程弹窗 -->
    <div v-if="showTutorial" class="modal-overlay" @click="showTutorial = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>使用教程</h2>
          <button class="close-btn" @click="showTutorial = false">&times;</button>
        </div>
        <div class="modal-body">
          <h3>1. 开始聊天</h3>
          <p>点击左侧菜单"聊天对话"，即可开始与心理支持助手进行交流。</p>
          
          <h3>2. 选择共情风格</h3>
          <p>在"设置"页面中，你可以选择不同的共情风格：</p>
          <ul>
            <li><strong>温暖支持型</strong>：温和、支持，多用鼓励的话语</li>
            <li><strong>专业指导型</strong>：专业、客观，提供具体指导</li>
            <li><strong>简洁直接型</strong>：简洁、直接，直击要害</li>
          </ul>
          
          <h3>3. 查看报告</h3>
          <p>对话结束后，系统会自动生成心理评估报告。点击"报告中心"查看所有历史报告。</p>
          
          <h3>4. 数据管理</h3>
          <p>在"设置"页面，你可以导出所有数据或清除本地数据。</p>
        </div>
      </div>
    </div>
    
    <!-- 常见问题弹窗 -->
    <div v-if="showFAQ" class="modal-overlay" @click="showFAQ = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>常见问题</h2>
          <button class="close-btn" @click="showFAQ = false">&times;</button>
        </div>
        <div class="modal-body">
          <h3>数据存储在哪里？</h3>
          <p>所有数据都存储在你的浏览器本地，不会上传到任何服务器。</p>
          
          <h3>如何保护我的隐私？</h3>
          <p>所有对话和报告都是本地存储的，只有你能访问。建议定期导出数据备份。</p>
          
          <h3>如何切换主题？</h3>
          <p>在"设置"页面的"个性化设置"中，选择"明亮模式"或"暗黑模式"即可。</p>
          
          <h3>报告生成需要多长时间？</h3>
          <p>通常只需要几秒钟。如果AI API响应较慢，可能需要等待更长时间。</p>
          
          <h3>可以删除单条报告吗？</h3>
          <p>目前支持在报告详情中删除单条报告，也可以在设置中清除所有数据。</p>
        </div>
      </div>
    </div>
    
    <!-- 联系开发者弹窗 -->
    <div v-if="showContact" class="modal-overlay" @click="showContact = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>联系开发者</h2>
          <button class="close-btn" @click="showContact = false">&times;</button>
        </div>
        <div class="modal-body">
          <p style="text-align: center; margin-bottom: 24px;">感谢您使用心理支持助手！</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="margin-bottom: 16px; color: #667eea;">联系方式</h3>
            <p style="margin-bottom: 12px;"><strong>邮箱：</strong>contact@psychhelper.com</p>
            <p style="margin-bottom: 12px;"><strong>官网：</strong>www.psychhelper.com</p>
            <p><strong>微信公众号：</strong>心理支持助手</p>
          </div>
          
          <div style="background: #e8f5e9; padding: 20px; border-radius: 10px;">
            <h3 style="margin-bottom: 16px; color: #4CAF50;">反馈建议</h3>
            <p style="margin-bottom: 12px;">如果您有任何问题或建议，欢迎通过以上方式联系我们。</p>
            <p>您的反馈将帮助我们持续改进产品。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import Chart from 'chart.js/auto'
import ReportList from './components/ReportList.vue'
import ReportDetail from './components/ReportDetail.vue'
import AdminDashboard from './components/AdminDashboard.vue'
import { verifyContent } from './contentVerifier.js'
import { loadCorpus } from './corpus.js'
import { userIdentifier } from './userIdentifier.js'
import { userBehaviorAnalyzer } from './userBehaviorAnalyzer.js'
import { userIdentifierTest } from './userIdentifier.test.js'
import { initUserRecognition, handleNewMessage, handleInputStart, handleInputEnd, handleResponseReceived, getUserRecognitionState, registerStateChangeCallback, userRecognition, promptSaveAsNewUser, performMatchingAtEnd, resetRecognition } from './stores/userRecognition.js'
import { emotionIndexCalculator } from './emotionIndexCalculator.js'
import { filterSensitiveInfo } from './utils/sensitiveFilter.js'

const { locale, t } = useI18n()

// 设置axios的baseURL
axios.defaults.baseURL = 'http://127.0.0.1:8000'



const messages = ref([])
const inputText = ref('')
const isLoading = ref(false)
const currentModel = ref('auto')

// Admin Panel
const versionClickCount = ref(0)
let clickTimer = null
const showAdminPanel = ref(false)
const showAdminAuthModal = ref(false)
const adminAuthenticated = ref(false)
const adminPassword = ref('')
const adminPasswordError = ref('')
const adminThreshold = ref(0.85)
const adminPosts = ref([])
// 初始时不使用localStorage中的userId，等待用户识别完成
const userId = ref(crypto.randomUUID())
const matchedUserId = ref(null)
const sessionId = ref(localStorage.getItem('psych_session_id') || crypto.randomUUID())
const reports = ref([])
const communityPosts = ref([])
const chatContainer = ref(null)
const emotionChart = ref(null)
const isRecording = ref(false)
const currentPage = ref('chat')
const currentPageNum = ref(1)
const pageSize = ref(4)  // 每页显示4条记录
const totalReports = ref(0)  // 总报告数
const reportListRef = ref(null)  // ReportList组件引用
const activeTab = ref('reports')
const empathyStyle = ref(localStorage.getItem('psych_empathy_style') || 'warm')
const theme = ref(localStorage.getItem('psych_theme') || 'light')
const fontSize = ref(localStorage.getItem('psych_font_size') || 'medium')
const notificationsEnabled = ref(localStorage.getItem('psych_notifications') === 'true')
const emailNotifications = ref(localStorage.getItem('psych_email_notifications') === 'true')
const newPostContent = ref('')
const newPostCategory = ref('share')
const isInputExpanded = ref(false)
const showReportDetail = ref(false)
const selectedReport = ref({})
const showTutorial = ref(false)
const showFAQ = ref(false)
const showContact = ref(false)
const conversationRound = ref(0); // 对话轮数
const isIdentificationEnabled = ref(true); // 是否启用识别
const isIdentified = ref(false); // 是否已识别
const isUserIdentified = computed(() => 
  userRecognition.state === 'matched' || userRecognition.isServerMatched || isIdentified.value
);
let recognition = null
let chartInstance = null

// 行为特征跟踪
const inputStartTime = ref(null)
const editCount = ref(0)
const lastInputTime = ref(null)

// 滚动位置保持
const chatScrollPosition = ref(0)
let shouldRestoreScroll = false

const navigateTo = (page) => {
  console.log('navigateTo 被调用，目标页面:', page)
  // 如果当前在聊天页面，离开前保存滚动位置
  if (currentPage.value === 'chat' && chatContainer.value) {
    chatScrollPosition.value = chatContainer.value.scrollTop
    console.log('保存聊天滚动位置:', chatScrollPosition.value)
  }
  showTutorial.value = false
  showFAQ.value = false
  showContact.value = false
  showReportDetail.value = false
  // 如果是切换回聊天页面，标记需要恢复滚动
  if (page === 'chat' && currentPage.value !== 'chat') {
    shouldRestoreScroll = true
  }
  currentPage.value = page
}

// 切换输入框展开/收起
const toggleInputExpand = () => {
  isInputExpanded.value = !isInputExpanded.value
}

// 保存用户ID和会话ID到本地存储
localStorage.setItem('psych_user_id', userId.value)
localStorage.setItem('psych_session_id', sessionId.value)

// 初始化主题、字体大小和语言
onMounted(() => {
  applyTheme(theme.value)
  applyFontSize(fontSize.value)
  document.documentElement.lang = locale.value
})

// 监听设置变化并保存到本地存储
watch(empathyStyle, (newValue) => {
  localStorage.setItem('psych_empathy_style', newValue)
})

watch(locale, (newValue) => {
  localStorage.setItem('app-lang', newValue)
  document.documentElement.lang = newValue
  reinitializeCommunityPosts()
})

watch(theme, (newValue) => {
  localStorage.setItem('psych_theme', newValue)
  applyTheme(newValue)
})

watch(fontSize, (newValue) => {
  localStorage.setItem('psych_font_size', newValue)
  applyFontSize(newValue)
})

watch(notificationsEnabled, (newValue) => {
  localStorage.setItem('psych_notifications', newValue)
})

watch(emailNotifications, (newValue) => {
  localStorage.setItem('psych_email_notifications', newValue)
})



const handleThemeChange = () => {
  applyTheme(theme.value)
}

const handleFontSizeChange = () => {
  applyFontSize(fontSize.value)
}

const applyTheme = (themeType) => {
  console.log('应用主题:', themeType)
  const html = document.documentElement
  
  if (themeType === 'dark') {
    html.setAttribute('data-theme', 'dark')
  } else {
    html.removeAttribute('data-theme')
  }
}

const applyFontSize = (size) => {
  const root = document.documentElement
  if (size === 'small') {
    root.style.fontSize = '14px'
  } else if (size === 'large') {
    root.style.fontSize = '18px'
  } else {
    root.style.fontSize = '16px'
  }
}

const exportAllData = () => {
  currentPage.value = 'reports'
}

const clearAllData = () => {
  const confirmed = confirm('确定要清除所有本地数据吗？此操作不可撤销。')
  console.log('清除数据确认结果:', confirmed)
  
  if (confirmed === true) {
    localStorage.clear()
    userId.value = crypto.randomUUID()
    sessionId.value = crypto.randomUUID()
    messages.value = []
    reports.value = []
    communityPosts.value = []
    empathyStyle.value = 'warm'
    locale.value = 'zh-CN'
    theme.value = 'light'
    fontSize.value = 'medium'
    notificationsEnabled.value = false
    emailNotifications.value = false
    // 重新保存新的用户ID和会话ID
    localStorage.setItem('psych_user_id', userId.value)
    localStorage.setItem('psych_session_id', sessionId.value)
    alert('所有数据已清除。')
  } else {
    console.log('用户取消了清除操作。')
  }
}

// 清除所有用户特征模板
const clearUserProfiles = () => {
  if (confirm('确定要清除所有用户特征模板吗？这将重置用户识别功能！')) {
    userIdentifier.clearAllProfiles()
    alert('所有用户特征模板已清除。')
  }
}

// 运行用户识别测试
const runIdentificationTest = () => {
  try {
    console.log('开始运行用户识别测试...')
    const result = userIdentifierTest.runIdentificationTests()
    alert(`用户识别测试完成！\n\n识别准确率: ${result.accuracy}%\n正确识别: ${result.correctIdentifications}/${result.totalTests}`)
  } catch (error) {
    console.error('用户识别测试失败:', error)
    alert('用户识别测试失败，请查看控制台日志。')
  }
}

// 初始化测试数据
const initializeTestData = () => {
  try {
    console.log('初始化用户识别测试数据...')
    userIdentifierTest.initializeTestData()
    alert('用户识别测试数据初始化完成！\n\n已创建3个年龄段测试用户的特征模板：\n• 小学生\n• 中年人\n• 老年人')
  } catch (error) {
    console.error('初始化测试数据失败:', error)
    alert('初始化测试数据失败，请查看控制台日志。')
  }
}

// 加载社区帖子
const loadCommunityPosts = async () => {
  try {
    const response = await axios.get('/community')
    if (response.data.posts && response.data.posts.length > 0) {
      communityPosts.value = response.data.posts
      // 确保所有帖子的评论区都是关闭的
      communityPosts.value.forEach(post => {
        post.showComments = false
      })
    } else {
      // 如果后端没有数据，显示示例帖子
      loadSamplePosts()
    }
  } catch (error) {
    console.error('加载社区帖子失败:', error)
    // 如果后端加载失败，尝试从localStorage加载
    const savedPosts = localStorage.getItem('psych_community_posts')
    if (savedPosts) {
      communityPosts.value = JSON.parse(savedPosts)
      communityPosts.value.forEach(post => {
        post.showComments = false
      })
    } else {
      // 添加一些示例帖子
      loadSamplePosts()
    }
  }
}

// 加载示例帖子
const loadSamplePosts = () => {
  communityPosts.value = [
    {
      id: '1',
      author: t('samplePost1Author'),
      content: t('samplePost1Content'),
      category: 'share',
      comments: [
        {
          id: 'c1',
          author: t('samplePost1CommentAuthor'),
          content: t('samplePost1CommentContent')
        }
      ],
      showComments: false,
      newComment: '',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      author: t('samplePost2Author'),
      content: t('samplePost2Content'),
      category: 'help',
      comments: [],
      showComments: false,
      newComment: '',
      createdAt: new Date().toISOString()
    }
  ]
  localStorage.setItem('psych_community_posts', JSON.stringify(communityPosts.value))
}

// 重新初始化社区帖子（当语言切换时）
const reinitializeCommunityPosts = () => {
  localStorage.removeItem('psych_community_posts')
  loadCommunityPosts()
}

// 创建新帖子
const createPost = async () => {
  if (!newPostContent.value.trim()) return

  const originalContent = newPostContent.value.trim()
  
  // 敏感信息过滤
  const filteredResult = filterSensitiveInfo(originalContent)
  const contentToCheck = filteredResult.filteredText
  
  // 如果有敏感信息，提示用户
  if (filteredResult.hasSensitiveInfo) {
    console.log('检测到敏感信息:', filteredResult.detectedTypes)
  }

  // 1. 先进行本地内容验证
  const verification = verifyContent(contentToCheck)

  if (!verification.passed) {
    alert(`${t('publishFailed')}：${verification.message}`)
    return
  }

  // 2. 使用情绪指数计算器检测风险
  const emotionData = emotionIndexCalculator.calculateEmotionIndex(contentToCheck)
  
  // 如果风险等级是高，直接禁止发布
  if (emotionData.riskLevel === '高') {
    alert(
      '⚠️ 内容检测不通过\n\n' +
      `情绪标签: ${emotionData.emotionLabel}\n` +
      `风险等级: ${emotionData.riskLevel}\n\n` +
      '该内容包含高风险信息，不适合在社区发布。\n' +
      '请修改内容后重试。'
    )
    return
  }

  // 3. 调用AI进行进一步分析
  try {
    isLoading.value = true
    const response = await axios.post('/chat', {
      user_id: userId.value || crypto.randomUUID(),
      message: `请分析以下内容是否包含负面信息，是否适合在心理支持社区发布：\n\n${contentToCheck}\n\n分析要求：\n1. 只返回"安全"或"不安"\n2. 不要返回其他任何内容`,
      empathy_style: 'professional',
      language: locale.value
    })

    const analysisResult = response.data.response?.trim() || ''
    
    if (analysisResult === '不安') {
      alert(
        '⚠️ AI内容检测不通过\n\n' +
        '检测到该内容可能包含负面信息，不适合在社区发布。\n' +
        '请修改内容后重试。'
      )
      isLoading.value = false
      return
    }

    // 4. 所有检测通过，发布帖子（发送过滤后的内容）
    publishPost(contentToCheck)
  } catch (error) {
    console.error('AI分析失败:', error)
    // AI分析失败时，再次检查本地风险等级确保安全
    if (emotionData.riskLevel === '中') {
      alert(
        '⚠️ 内容审核中\n\n' +
        '由于系统暂时无法完成AI审核，\n' +
        '建议您修改内容后再发布，确保内容积极健康。'
      )
      isLoading.value = false
      return
    }
    // 只有低风险内容才在AI失败时发布
    publishPost(contentToCheck)
  } finally {
    isLoading.value = false
  }
}

// 发布帖子的辅助函数
const publishPost = async (content) => {
  const emotionData = emotionIndexCalculator.calculateEmotionIndex(content)
  
  try {
    isLoading.value = true
    const response = await axios.post('/community/posts', {
      title: '',
      content: content,
      category: newPostCategory.value,
      author: t('anonymousUser'),
      author_id: userId.value,
      emotion_index: emotionData.emotionIndex,
      risk_level: emotionData.riskLevel
    })
    
    if (response.data.posts) {
      communityPosts.value = response.data.posts
    }
    
    newPostContent.value = ''
    newPostCategory.value = 'share'
    sortCommunityPosts()
  } catch (error) {
    console.error('发布帖子失败:', error)
    alert('发布失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 排序社区帖子
const sortCommunityPosts = () => {
  communityPosts.value.sort((a, b) => {
    // 先按日期排序（降序）
    const dateA = new Date(a.createdAt).setHours(0, 0, 0, 0)
    const dateB = new Date(b.createdAt).setHours(0, 0, 0, 0)

    if (dateA !== dateB) {
      return dateB - dateA
    }

    // 同日期内按回复数排序（降序）
    return (b.comments?.length || 0) - (a.comments?.length || 0)
  })
}

// 切换评论显示
const toggleComments = (postId) => {
  const post = communityPosts.value.find(p => p.id === postId)
  if (post) {
    post.showComments = !post.showComments
  }
}

// 添加评论
const addComment = async (postId) => {
  const post = communityPosts.value.find(p => p.id === postId)
  if (post && post.newComment?.trim()) {
    const contentToCheck = post.newComment.trim()
    
    // 1. 先进行本地内容验证
    const verification = verifyContent(contentToCheck)

    if (!verification.passed) {
      alert(`${t('commentFailed')}：${verification.message}`)
      return
    }

    // 2. 使用情绪指数计算器检测风险
    const emotionData = emotionIndexCalculator.calculateEmotionIndex(contentToCheck)
    
    // 如果风险等级是高，直接禁止发布
    if (emotionData.riskLevel === '高') {
      alert(
        '⚠️ 评论检测不通过\n\n' +
        `情绪标签: ${emotionData.emotionLabel}\n` +
        `风险等级: ${emotionData.riskLevel}\n\n` +
        '该评论包含高风险信息，不适合发布。\n' +
        '请修改内容后重试。'
      )
      return
    }

    // 3. 调用AI进行进一步分析
    try {
      isLoading.value = true
      const response = await axios.post('/chat', {
        user_id: userId.value || crypto.randomUUID(),
        message: `请分析以下评论内容是否包含负面信息，是否适合在心理支持社区发布：\n\n${contentToCheck}\n\n分析要求：\n1. 只返回"安全"或"不安"\n2. 不要返回其他任何内容`,
        empathy_style: 'professional',
        language: locale.value
      })

      const analysisResult = response.data.response?.trim() || ''
      
      if (analysisResult === '不安') {
        alert(
          '⚠️ AI评论检测不通过\n\n' +
          '检测到该评论可能包含负面信息，不适合发布。\n' +
          '请修改内容后重试。'
        )
        isLoading.value = false
        return
      }

      // 4. 所有检测通过，添加评论
      publishComment(post, contentToCheck)
    } catch (error) {
      console.error('AI分析失败:', error)
      // AI分析失败时，再次检查本地风险等级确保安全
      if (emotionData.riskLevel === '中') {
        alert(
          '⚠️ 评论审核中\n\n' +
          '由于系统暂时无法完成AI审核，\n' +
          '建议您修改评论后再发布，确保内容积极健康。'
        )
        isLoading.value = false
        return
      }
      // 只有低风险内容才在AI失败时发布
      publishComment(post, contentToCheck)
    } finally {
      isLoading.value = false
    }
  }
}

// 发布评论的辅助函数
const publishComment = async (post, content) => {
  try {
    isLoading.value = true
    const response = await axios.post(`/community/posts/${post.id}/comments`, {
      content: content,
      author: t('anonymousUser'),
      author_id: userId.value
    })
    
    if (response.data.posts) {
      communityPosts.value = response.data.posts
    }
  } catch (error) {
    console.error('发布评论失败:', error)
    alert('发布评论失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 强制初始化所有数�?
const initializeAllData = () => {
  loadReports()
  loadCommunityPosts()
}

// 监听页面切换，确保数据加载并记录页面访问
watch(currentPage, async (newPage) => {
  showTutorial.value = false
  showFAQ.value = false
  showContact.value = false
  showReportDetail.value = false

  if (newPage === 'chat' && shouldRestoreScroll) {
    console.log('恢复聊天滚动位置到:', chatScrollPosition.value)
    nextTick(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatScrollPosition.value
        shouldRestoreScroll = false
      }
    })
  }

  if (newPage === 'reports') {
    loadReports()
  } else if (newPage === 'community') {
    await loadCommunityPosts()
  }
  
  // 记录页面访问
  if (userId.value) {
    userBehaviorAnalyzer.recordPageVisit(userId.value, newPage)
  }
})

// 监听用户身份变化，自动刷新报告列表
watch(userId, (newUserId, oldUserId) => {
  console.log('用户身份变化:', oldUserId, '->', newUserId)
  if (newUserId && currentPage.value === 'reports') {
    loadReports()
  }
})

// 页面加载时初始化数据
onMounted(async () => {
  await loadCorpus()
  
  // 开始用户行为会话
  if (userId.value) {
    userBehaviorAnalyzer.startSession(userId.value)
  }
  
  // 首次进入时，始终显示新用户欢迎消息
  addMessage('你好！我是你的心理支持助手。有什么想和我聊聊的吗？', 'assistant')
  
  // 初始化社区帖子，但不初始化报告（报告需要用户识别后才能加载）
  loadCommunityPosts()
  
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
  
  // 初始化新的用户识别系统
  await initUserRecognition()
  
  // 注册状态变化回调
  registerStateChangeCallback((stateInfo) => {
    console.log('用户识别状态变化:', stateInfo)
    
    // 如果匹配成功，应用用户偏好并加载报告
    if (stateInfo.newState === 'matched') {
      const prefs = userRecognition.preferences
      
      empathyStyle.value = prefs.empathyStyle || empathyStyle.value
      theme.value = prefs.theme || theme.value
      locale.value = prefs.language === 'zh' ? 'zh-CN' : 'en-US'
      
      localStorage.setItem('psych_empathy_style', empathyStyle.value)
      localStorage.setItem('psych_theme', theme.value)
      localStorage.setItem('app-lang', locale.value)
      
      // 更新用户ID
      if (userRecognition.currentUserId) {
        userId.value = userRecognition.currentUserId
        matchedUserId.value = userRecognition.currentUserId
        isIdentified.value = true
        localStorage.setItem('psych_user_id', userRecognition.currentUserId)
        
        // 加载匹配用户的报告
        loadReports()
      }
      
      if (userRecognition.contextSummary) {
        if (confirm(`检测到您的历史对话，是否恢复上下文摘要？\n\n${userRecognition.contextSummary}`)) {
          addMessage(`欢迎回来！已识别您的使用习惯。\n\n上次对话摘要：${userRecognition.contextSummary}`, 'assistant', true)
        } else {
          addMessage('欢迎回来！已识别您的使用习惯，已应用您的偏好设置。', 'assistant', true)
        }
      } else {
        addMessage('欢迎回来！已识别您的使用习惯，已应用您的偏好设置。', 'assistant', true)
      }
    }
    
    // 如果是新用户，保持新用户状态，报告中心为空
    if (stateInfo.newState === 'new_user') {
      const newUserId = crypto.randomUUID()
      userId.value = newUserId
      matchedUserId.value = null
      isIdentified.value = false
      localStorage.setItem('psych_user_id', newUserId)
      console.log('创建新用户ID:', newUserId)
      
      // 清空报告列表（确保新用户看不到任何报告）
      reports.value = []
    }
    
    // 如果进入询问保存状态
    if (stateInfo.newState === 'asking_to_save') {
      userRecognition.pendingTemplateToSave = null
    }
  })
})

// 显示危机干预帮助信息
const showCrisisHelp = () => {
  const crisisHtml = `
    <div class="summary-card" style="background: #ffebee; border-left-color: #f44336;">
      <h4 style="color: #c62828;">危机干预提醒</h4>
      <p>如果您正面临紧急情况，请立即寻求专业帮助：</p>
      <ul>
        <li>心理危机干预热线：400-161-9995</li>
        <li>全国24小时心理援助热线：400-995-9950</li>
        <li>生命热线：400-161-9995</li>
      </ul>
      <p>记住，您并不孤单，有很多人愿意帮助您度过难关。</p>
    </div>
  `
  addMessage(crisisHtml, 'assistant', true)
}

// 检测高风险内容
const detectHighRisk = (text) => {
  const highRiskKeywords = [
    '自杀', '自虐', '自残', '想死', '活不下去', '结束生命',
    '跳楼', '割腕', '服药', '上吊', '痛苦', '绝望',
    '崩溃', '撑不下去', '没有希望', '生无可恋', '厌世'
  ]
  
  const mediumRiskKeywords = [
      '压力', '焦虑', '抑郁', '失眠', '情绪低落',
      '烦躁', '不安', '难过', '伤心', '孤独'
    ]
  
  const lowerCaseText = text.toLowerCase()
  
  for (const keyword of highRiskKeywords) {
    if (lowerCaseText.includes(keyword)) {
      return 'high'
    }
  }
  
  for (const keyword of mediumRiskKeywords) {
    if (lowerCaseText.includes(keyword)) {
      return 'medium'
    }
  }
  
  return 'low'
}

// 添加消息
const addMessage = (content, role, isHtml = false, usedModel = null, emotionData = null) => {
  messages.value.push({
    role,
    content: content,
    isHtml,
    timestamp: new Date().toLocaleTimeString(),
    isoTimestamp: new Date().toISOString(),
    usedModel,
    emotionData // 情绪指数数据
  })
  
  // 检测高风险内容并显示危机干预信息
  if (role === 'user' && !isHtml) {
    const riskLevel = detectHighRisk(content)
    if (riskLevel === 'high') {
      setTimeout(() => {
        showCrisisHelp()
      }, 500)
    }
  }
}



// 滚动到底�?
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 解析风险标签
const getRiskTag = (text) => {
  const match = text.match(/\[风险等级[�?]\s*([低中高]+)\]/)
  if (match) return match[1]
  return null
}

// 获取风险标签样式
const getRiskClass = (text) => {
  const tag = getRiskTag(text)
  if (!tag) return ''
  if (tag === '低') return 'risk-low'
  if (tag === '中') return 'risk-medium'
  if (tag === '高') return 'risk-high'
  return ''
}

// 移除风险标签
const removeRiskTag = (text) => {
  return text.replace(/\[风险等级：\s*[低中高]+\]\s*/, '')
}

let cancelToken = null

// 发送消息
const handleSend = async () => {
  if (!inputText.value.trim()) return
  
  const originalMessage = inputText.value
  inputText.value = ''
  
  // 敏感信息过滤
  console.log('原始消息:', originalMessage)
  const filteredResult = filterSensitiveInfo(originalMessage)
  console.log('过滤结果:', filteredResult)
  const messageToSend = filteredResult.filteredText
  
  // 如果有敏感信息，提示用户
  if (filteredResult.hasSensitiveInfo) {
    console.log('检测到敏感信息:', filteredResult.detectedTypes)
  }
  
  // 如果是第一轮对话，非阻塞尝试进行用户匹配
  if (conversationRound.value === 0 && messages.value.length === 0) {
    attemptUserMatchingOnNewConversation(originalMessage)
  }
  
  // 增加对话轮数
  conversationRound.value++
  
  // 计算行为特征
  const behaviorData = {}
  if (inputStartTime.value) {
    const inputDuration = (Date.now() - inputStartTime.value) / 1000 // 秒
    if (inputDuration > 0 && originalMessage.length > 0) {
      behaviorData.typingSpeed = originalMessage.length / inputDuration // 字符/秒
    }
    behaviorData.editFrequency = editCount.value
  }
  
  // 计算情绪指数
  const emotionData = emotionIndexCalculator.calculateEmotionIndex(originalMessage, behaviorData)
  
  // 重置行为跟踪
  inputStartTime.value = null
  editCount.value = 0
  
  // 分析用户输入特征，更新用户模板（保留原有功能以兼容历史数据）
  if (userId.value) {
    userIdentifier.analyzeUserInput(originalMessage, userId.value)
  }
  
  // 记录消息发送行为
  if (userId.value) {
    userBehaviorAnalyzer.recordMessage(userId.value, originalMessage.length)
  }
  
  addMessage(originalMessage, 'user', false, null, emotionData)
  scrollToBottom()
  isLoading.value = true
  
  let systemResponse = ''
  
  try {
    // 创建取消令牌
    cancelToken = axios.CancelToken.source()
    
    // 正常对话模式 - 传递empathy_style、user_id和语言设置
    const response = await axios.post('/chat', {
      user_id: userId.value || sessionId.value,
      message: messageToSend,
      empathy_style: empathyStyle.value,
      language: locale.value
    }, {
      cancelToken: cancelToken.token
    })
    
    const result = response.data
    systemResponse = result.response
    addMessage(systemResponse, 'assistant')
  } catch (err) {
    if (axios.isCancel(err)) {
      addMessage('对话已中断', 'assistant')
    } else {
      systemResponse = '抱歉，我遇到了一些问题，请稍后再试。'
      addMessage(systemResponse, 'assistant')
    }
  } finally {
    isLoading.value = false
    cancelToken = null
    scrollToBottom()
  }
  
  // 使用新的用户识别系统处理消息
  handleNewMessage(originalMessage, systemResponse)
}

// 输入框聚焦事件 - 开始记录输入时间
const handleInputFocus = () => {
  inputStartTime.value = Date.now()
  lastInputTime.value = Date.now()
}

// 输入框输入事件 - 记录编辑次数
const handleInputChange = () => {
  if (lastInputTime.value) {
    editCount.value++
  }
}

// 中止对话
const cancelChat = () => {
  if (cancelToken) {
    cancelToken.cancel('User cancelled the request')
    isLoading.value = false
  }
}

// 结束会话
const handleEndSession = async () => {
  if (!confirm('确定结束当前会话吗？系统将生成会话报告。')) return        

  isLoading.value = true
  try {
    // 结束用户行为会话
    if (userId.value) {
      userBehaviorAnalyzer.endSession(userId.value)
    }
    
    // 保存当前聊天记录，使用isoTimestamp作为timestamp，并包含情绪数据
    // 从第一个用户消息开始截取
    let chatHistory = [...messages.value]
      .filter(msg => !msg.isHtml)
    
    // 找到第一个用户消息的索引
    const firstUserMsgIndex = chatHistory.findIndex(msg => msg.role === 'user')
    if (firstUserMsgIndex > 0) {
      // 如果有用户消息且不是第一条，从第一条用户消息开始
      chatHistory = chatHistory.slice(firstUserMsgIndex)
    } else if (firstUserMsgIndex === -1) {
      // 没有用户消息，使用空数组
      chatHistory = []
    }
    
    // 转换格式
    chatHistory = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.isoTimestamp || new Date().toISOString(),
      emotionData: msg.emotionData || null
    }))
    
    // 计算对话轮数
    const conversationRounds = chatHistory.length
    
    // 显示会话已结束提示（不清空历史消息）
    addMessage('会话已结束，正在处理...', 'assistant')
    scrollToBottom()
    
    // 显示加载状态
    isLoading.value = true
    
    // 先保存原始用户ID
    const originalUserId = userId.value
    
    // 确定最终用于保存报告的用户ID
    let finalUserId = originalUserId
    
    // 如果对话轮数 >= 5，先进行用户匹配
    if (conversationRounds >= 5) {
      await performMatchingAtEnd()
      
      // 如果用户确认匹配，则使用匹配到的用户ID
      if (userRecognition.currentUserId && userRecognition.isServerMatched) {
        finalUserId = userRecognition.currentUserId
      }
    }
    
    // 生成报告 - 使用确定后的用户ID
    const response = await axios.post('/end_session', {
      user_id: finalUserId,
      chat_history: chatHistory,
      conversation_rounds: conversationRounds
    })
    
    const result = response.data
    
    // 清空本次聊天记录
    setTimeout(() => {
      messages.value = []
      // 清空后添加欢迎消息和报告保存提示
      addMessage('报告已保存，您可以在报告中心查看历史记录。', 'assistant')
      addMessage('你好！我是你的心理支持助手。有什么想和我聊聊的吗？', 'assistant')
    }, 1000)
    
    // 保存匹配到的用户信息
    const matchedUserIdSaved = userRecognition.currentUserId
    const isMatchedSaved = userRecognition.isServerMatched
    
    // 刷新报告列表（显示当前用户的报告）
    await loadReports()
    
    // 重置会话
    sessionId.value = crypto.randomUUID()
    localStorage.setItem('psych_session_id', sessionId.value)
    
    // 重置情绪指数计算器
    emotionIndexCalculator.resetSession()
    
    // 重置用户识别状态，为新会话做准备
    resetRecognition()
    
    // 恢复匹配到的用户信息，或者保持原始用户ID
    if (matchedUserIdSaved && isMatchedSaved) {
      userId.value = matchedUserIdSaved
      isIdentified.value = true
      matchedUserId.value = matchedUserIdSaved
      localStorage.setItem('psych_user_id', matchedUserIdSaved)
    } else {
      // 如果没有匹配成功，保持原始用户ID，不生成新ID
      userId.value = originalUserId
      localStorage.setItem('psych_user_id', originalUserId)
    }
    
    // 重置其他相关状态
    conversationRound.value = 0
    inputStartTime.value = null
    editCount.value = 0
    lastInputTime.value = null
    
    // 重新开始用户行为会话
    if (userId.value) {
      userBehaviorAnalyzer.startSession(userId.value)
    }
    
    // 重新初始化用户识别系统
    await initUserRecognition()
    
  } catch (err) {
    console.error('报告生成错误:', err)
    addMessage('报告生成失败，请稍后再试。', 'assistant')
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 尝试用户匹配（基于完整对话历史）
const attemptUserMatching = async (chatHistory) => {
  try {
    const featureResponse = await axios.post('/extract_features', {
      messages: chatHistory
    })
    
    const featureVector = featureResponse.data.feature_vector
    
    const matchResponse = await axios.post('/identify_user', {
      feature_vector: featureVector,
      min_rounds: 5
    })
    
    if (matchResponse.data.matched && matchResponse.data.user_id) {
      const foundUserId = matchResponse.data.user_id
      const similarity = matchResponse.data.similarity
      
      const useMatchedUser = confirm(
        `检测到您的使用习惯与已有用户匹配度达到 ${Math.round(similarity * 100)}%！\n\n` +
        `是否切换到该用户身份？这样可以查看该用户的历史报告。`
      )
      
      if (useMatchedUser) {
        userId.value = foundUserId
        matchedUserId.value = foundUserId
        isIdentified.value = true
        localStorage.setItem('psych_user_id', foundUserId)
        
        addMessage(`已切换到匹配用户，相似度：${Math.round(similarity * 100)}%`, 'assistant', true)
        
        await loadReports()
        
        addMessage('已加载该用户的历史报告，您可以在报告中心查看。', 'assistant', true)
      } else {
        addMessage('您选择保持当前用户身份，本次会话将作为新用户保存。', 'assistant', true)
        
        const newUserId = 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9)
        userId.value = newUserId
        localStorage.setItem('psych_user_id', newUserId)
        
        await loadReports()
      }
    }
  } catch (error) {
    console.warn('用户匹配失败:', error)
  }
}

// 新对话开始时尝试用户匹配（基于第一条消息）
const attemptUserMatchingOnNewConversation = async (firstMessage) => {
  try {
    const templates = await axios.get('/user_templates')
    
    if (!templates.data.templates || templates.data.templates.length === 0) {
      return
    }
    
    const messages = [{ role: 'user', content: firstMessage }]
    
    const featureResponse = await axios.post('/extract_features', {
      messages: messages
    })
    
    const featureVector = featureResponse.data.feature_vector
    
    const matchResponse = await axios.post('/identify_user', {
      feature_vector: featureVector,
      min_rounds: 1
    })
    
    if (matchResponse.data.matched && matchResponse.data.user_id) {
      const foundUserId = matchResponse.data.user_id
      const similarity = matchResponse.data.similarity
      
      const useMatchedUser = confirm(
        `检测到您可能是返回用户，匹配度：${Math.round(similarity * 100)}%\n\n` +
        `是否使用已有的用户身份？这样可以查看您之前的对话报告。`
      )
      
      if (useMatchedUser) {
        userId.value = foundUserId
        matchedUserId.value = foundUserId
        isIdentified.value = true
        localStorage.setItem('psych_user_id', foundUserId)
        
        await loadReports()
        
        if (reports.value.length > 0) {
          addMessage(`欢迎回来！已为您加载 ${reports.value.length} 份历史报告。`, 'assistant', true)
        } else {
          addMessage('欢迎回来！未找到您的历史报告。', 'assistant', true)
        }
      }
    }
  } catch (error) {
    console.warn('新对话用户匹配失败:', error)
  }
}

// 查看报告详情
const viewReport = (report) => {
  selectedReport.value = report
  showReportDetail.value = true
}

// 关闭报告详情
const closeReportDetail = () => {
  showReportDetail.value = false
  selectedReport.value = {}
}

// 分析报告情绪
const analyzeReportEmotions = (reportData) => {
  // 简单的情绪分析逻辑
  const emotionScores = []
  const labels = []
  
  reportData.forEach(report => {
    let score = 50 // 中性情绪
    
    // 根据风险等级调整情绪分数
    if (report.risk === '高') {
      score = 20
    } else if (report.risk === '中') {
      score = 40
    } else if (report.risk === '低') {
      score = 60
    }
    
    // 根据摘要内容进一步调整
    const summary = (report.summary || '').toLowerCase()
    if (summary.includes('开心') || summary.includes('愉快') || summary.includes('积极')) {
      score += 20
    } else if (summary.includes('难过') || summary.includes('悲伤') || summary.includes('痛苦')) {
      score -= 20
    }
    
    // 确保分数�?-100之间
    score = Math.max(0, Math.min(100, score))
    
    emotionScores.push(score)
    labels.push(report.time)
  })
  
  return { emotionScores, labels }
}

// 绘制情绪趋势�?
const drawEmotionChart = () => {
  if (!emotionChart.value || reports.value.length === 0) return
  
  // 销毁旧图表
  if (chartInstance) {
    chartInstance.destroy()
  }
  
  const { emotionScores, labels } = analyzeReportEmotions(reports.value)
  
  const ctx = emotionChart.value.getContext('2d')
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '情绪指数',
        data: emotionScores,
        borderColor: '#764ba2',
        backgroundColor: 'rgba(94, 124, 230, 0.1)',
        tension: 0.4,
        fill: true
      }]
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
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '情绪指数 (0-100)'
          }
        }
      }
    }
  })
}

// 加载报告
const loadReports = async () => {
  if (userId.value) {
    try {
      const response = await axios.get('/reports', {
        params: { user_id: userId.value }
      })
      reports.value = response.data
    } catch (err) {
      // 如果加载失败，使用示例数�?
      reports.value = [
        {
          id: '1',
          time: new Date().toLocaleTimeString(),
          risk: '低',
          summary: '用户今天心情不错，主要讨论了工作上的一些小问题，情绪稳定。',
          keywords: ['工作', '情绪稳定'],
          emotion: '积极'
        },
        {
          id: '2',
          time: new Date(Date.now() - 86400000).toLocaleTimeString(),
          risk: '中',
          summary: '用户提到了一些压力和焦虑，需要更多的支持和建议。',
          keywords: ['压力', '焦虑'],
          emotion: '中性'
        }
      ]
    }
  } else {
    // 如果没有userId，使用示例数据
    reports.value = [
      {
        id: '1',
        time: new Date().toLocaleTimeString(),
        risk: '低',
        summary: '用户今天心情不错，主要讨论了工作上的一些小问题，情绪稳定。',
        keywords: ['工作', '情绪稳定'],
        emotion: '积极'
      },
      {
        id: '2',
        time: new Date(Date.now() - 86400000).toLocaleTimeString(),
        risk: '中',
        summary: '用户提到了一些压力和焦虑，需要更多的支持和建议。',
        keywords: ['压力', '焦虑'],
        emotion: '中性'
      }
    ]
  }
  
  // 绘制情绪趋势图
  nextTick(() => {
    drawEmotionChart()
  })
}

// 切换页面
const changePage = (page) => {
  const totalPages = Math.ceil(totalReports.value / pageSize.value)
  if (page >= 1 && page <= totalPages) {
    currentPageNum.value = page
    // 调用ReportList组件的setCurrentPage方法
    if (reportListRef.value) {
      reportListRef.value.setCurrentPage(page)
    }
  }
}

// 清空报告
const clearAllReports = async () => {
    if (!userId.value) return
    if (!confirm('确定清空所有历史报告吗？此操作不可恢复。')) return        

    try {
    await axios.post('/reports/clear', {
      user_id: userId.value
    })
    reports.value = []
    
    // 清空图表
    if (chartInstance) {
      chartInstance.destroy()
      chartInstance = null
    }
  } catch (err) {
    console.error('清空报告失败', err)
  }
}

// Admin Panel Functions
const handleVersionClick = () => {
  versionClickCount.value++;
  if (clickTimer) clearTimeout(clickTimer);
  clickTimer = setTimeout(() => { versionClickCount.value = 0; }, 2000);
  if (versionClickCount.value >= 4) {
    showAdminAuthModal.value = true;
    versionClickCount.value = 0;
  }
};

const verifyAdminPassword = () => {
  if (adminPassword.value === 'admin123') {
    adminAuthenticated.value = true;
    adminPasswordError.value = '';
    adminPassword.value = '';
    loadAdminThreshold(); loadAdminPosts();
  } else { adminPasswordError.value = '密码错误，请重试'; }
};

const verifyAdminPasswordWithModal = () => {
  if (adminPassword.value === 'admin123') {
    adminAuthenticated.value = true;
    adminPasswordError.value = '';
    adminPassword.value = '';
    showAdminAuthModal.value = false;
    currentPage.value = 'admin';
    loadAdminThreshold(); 
    loadAdminPosts();
  } else { 
    adminPasswordError.value = '密码错误，请重试'; 
  }
};

const handleAdminLogout = () => {
  adminAuthenticated.value = false;
  currentPage.value = 'chat';
};

const loadAdminThreshold = async () => {
  try {
    const r = await axios.get('/admin/threshold');
    if (r.data.threshold !== undefined) adminThreshold.value = r.data.threshold;
  } catch (e) { console.error('加载阈值失败:', e); }
};
const updateAdminThreshold = () => {};
const saveAdminThreshold = async () => {
  try {
    await axios.post('/admin/threshold', { threshold: adminThreshold.value });
    alert('阈值保存成功！');
  } catch (e) { console.error('保存阈值失败:', e); alert('保存失败，请重试'); }
};
const loadAdminPosts = async () => {
  try {
    const r = await axios.get('/community');
    adminPosts.value = r.data.posts || [];
  } catch (e) { console.error('加载帖子失败:', e); }
};
const deleteAdminPost = async (postId) => {
  if (!confirm('确定要删除这个帖子吗？')) return;
  try {
    await axios.delete(`/community/posts/${postId}`);
    alert('帖子删除成功！');
    loadAdminPosts();
  } catch (e) { console.error('删除帖子失败:', e); alert('删除失败，请重试'); }
};

// 语音输入功能
const toggleVoiceInput = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('您的浏览器不支持语音输入功能')
    return
  }

  if (isRecording.value) {
    if (recognition) {
      recognition.stop()
      isRecording.value = false
    }
  } else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      isRecording.value = true
    }

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      inputText.value = transcript
    }

    recognition.onend = () => {
      isRecording.value = false
    }

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error)
      isRecording.value = false
    }

    recognition.start()
  }
}

// 基于报告延续对话
const continueFromReport = (report) => {
  // 清空当前对话
  messages.value = []
  
  // 添加报告内容作为新对话的起点
  const reportHtml = `
    <div class="report-card">
      <div class="report-header">
        <div class="report-title">
          历史报告
          <span class="report-time">${report.time}</span>
        </div>
      </div>
      <div class="report-body">
        <div class="report-details">
          <p><strong>风险等级�?/strong>${report.risk}</p>
          <p><strong>摘要�?/strong>${report.summary}</p>
        </div>
      </div>
    </div>
  `
  addMessage(reportHtml, 'assistant', true)
  
  // 自动生成一个相关问�?
  const question = `我想了解关于这份报告的更多信息：${report.summary}，请你帮我分析一下。`
  inputText.value = question
  handleSend()
}


</script>

<style>
/* 确保侧边栏永远可点击的强制定义 */
.sidebar {
  position: relative !important;
  z-index: 9999999 !important;
  pointer-events: auto !important;
}

.sidebar .nav-menu {
  position: relative !important;
  z-index: 9999999 !important;
  pointer-events: auto !important;
}

.sidebar .nav-item {
  position: relative !important;
  z-index: 99999999 !important;
  pointer-events: auto !important;
  cursor: pointer !important;
}

/* 所有模态框遮罩层都不覆盖侧边栏 */
.modal-overlay,
.report-detail-overlay {
  left: 250px !important;
  z-index: 1000 !important;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  max-width: 1080px;
  width: 1080px;
  margin: 0 auto;
  background: #fff;
  border-radius: 10px;
  text-align: justify;
}

.sidebar {
  width: 250px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  flex-direction: column;
  padding-left: 5px;
  padding-right: 5px;
  margin-top: 10px;
  margin-bottom: 10px;
  margin-left: 5px;
  margin-right: 5px;
  border-radius: 10px;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  position: static;
  z-index: 9999 !important;
  pointer-events: auto !important;
}

.logo {
  padding-top: 10px;
  padding-bottom: 10px;
  padding-left: 20px;
  padding-right: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: 10px;
  margin-bottom: 10px;
  height: 60px;
  text-align: center;
}

.logo h2 {
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 1.4rem;
  font-weight: 600;
  height: 33px;
}

.nav-menu {
  flex: 1;
  padding-top: 0;
  padding-bottom: 0;
  padding-left: 5px;
  padding-right: 5px;
  margin-top: 10px;
  margin-bottom: 10px;
  text-align: center;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  margin-bottom: 5px;
  border-radius: 10px;
  cursor: pointer !important;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.9);
  position: relative;
  z-index: 10000 !important;
  pointer-events: auto !important;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(5px);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.nav-item i {
  font-size: 1.2rem;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 0;
  padding-bottom: 0;
  padding-left: 0;
  padding-right: 0;
  margin-top: 10px;
  margin-bottom: 10px;
  margin-left: 0;
  margin-right: 0;
  width: 780px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
  overflow: hidden;
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
  overflow: hidden;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin-left: 5px;
  margin-right: 5px;
  margin-top: 0;
  margin-bottom: 0;
  padding-left: 5px;
  padding-right: 5px;
  padding-top: 0;
  padding-bottom: 0;
  border-radius: 0;
  width: 1200px;
  overflow: hidden;
}

header {
  padding-left: 0;
  padding-right: 0;
  padding-top: 20px;
  padding-bottom: 20px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.user-info {
  margin-top: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 14px;
  display: inline-block;
  backdrop-filter: blur(4px);
}

header h1 {
  font-size: 2rem;
  margin-bottom: 8px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

header p {
  font-size: 1rem;
  opacity: 0.9;
  font-weight: 300;
}

.page-body {
  flex: 1;
  overflow-y: auto;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding-left: 10px;
  padding-right: 10px;
  max-height: calc(100vh - 240px);
  scrollbar-width: thin;
  scrollbar-color: #667eea #f0f0f0;
  position: relative;
}

.chat-container::-webkit-scrollbar {
  width: 8px;
}

.chat-container::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 10px;
}

.chat-container::-webkit-scrollbar-thumb {
  background: #667eea;
  border-radius: 10px;
}

.chat-container::-webkit-scrollbar-thumb:hover {
  background: #764ba2;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 20px;
  word-wrap: break-word;
  font-size: 0.95rem;
  line-height: 1.4;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  margin-top: 10px;
  margin-bottom: 10px;
}

.message:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.user-message {
  align-self: flex-end;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border-bottom-right-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.assistant-message {
  align-self: flex-start;
  background: #ffffff;
  color: #2c3e50;
  border-bottom-left-radius: 6px;
  border: 1px solid #e9ecef;
}

.timestamp {
  font-size: 0.7rem;
  opacity: 0.6;
  margin-top: 4px;
  text-align: right;
}

.model-badge {
  font-size: 0.65rem;
  opacity: 0.6;
  margin-top: 4px;
  text-align: right;
}

.risk-tag {
  display: inline-block;
  background: #ffc107;
  color: #212529;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: bold;
  margin-right: 8px;
  vertical-align: middle;
}

.risk-low { background: #28a745; color: white; }
.risk-medium { background: #fd7e14; color: white; }
.risk-high { background: #dc3545; color: white; }

.input-area {
  border-top: 1px solid #e9ecef;
  padding: 20px;
  background: #ffffff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  position: relative;
  border-radius: 10px;
}

.input-wrapper {
  position: relative;
  margin-bottom: 15px;
}

textarea {
  width: 100%;
  border: 2px solid #e9ecef;
  border-radius: 28px;
  padding: 14px 20px;
  padding-right: 60px;
  font-size: 0.95rem;
  resize: none;
  font-family: inherit;
  outline: none;
  transition: all 0.3s ease;
  background: #f9f9f9;
}

textarea:focus {
  border-color: #667eea;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.voice-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
  z-index: 1;
}

.voice-btn:hover {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.voice-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.voice-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: translateY(-50%) scale(1);
}

.expandable-textarea {
  transition: all 0.3s ease;
  resize: none;
}

.input-expand-btn {
  background: transparent;
  color: #667eea;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  box-shadow: 0 1px 3px rgba(102, 126, 234, 0.2);
  transition: all 0.3s ease;
  margin-left: 10px;
}

.input-expand-btn:hover {
  color: #764ba2;
  transform: scale(1.05);
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.input-expand-btn:active {
  transform: scale(0.95);
}

.input-options {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 12px;
}

.diary-mode-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.diary-mode-toggle input[type="checkbox"] {
  accent-color: #667eea;
}

.summary-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 24px;
  padding: 8px 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}

.summary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.4);
}

.summary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.summary-card {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  border-radius: 8px;
  padding: 12px;
  margin: 10px 0;
}

.summary-card h4 {
  margin-bottom: 8px;
  color: #1976d2;
}

.keywords {
  margin-top: 8px;
  font-size: 0.85rem;
}

.keyword {
  background: #bbdefb;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  margin-right: 6px;
}

.emotion {
  margin-top: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #1976d2;
}

.diary-card {
  background: #f3e5f5;
  border-left: 4px solid #9c27b0;
  border-radius: 8px;
  padding: 12px;
  margin: 10px 0;
}

.diary-card h4 {
  margin-bottom: 8px;
  color: #7b1fa2;
}

.diary-meta {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #6a1b9a;
}

select {
  padding: 10px 16px;
  border-radius: 24px;
  border: 2px solid #e9ecef;
  background: #ffffff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

select:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

button {
  padding: 10px 20px;
  border-radius: 24px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.4);
}

button:active {
  transform: translateY(0);
}

button.danger {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  box-shadow: 0 2px 6px rgba(244, 67, 54, 0.3);
}

button.danger:hover {
  box-shadow: 0 4px 10px rgba(244, 67, 54, 0.4);
}

button.warning {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
}

button.warning:hover {
  box-shadow: 0 4px 10px rgba(255, 152, 0, 0.4);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.history-sidebar {
  width: 320px;
  background: #ffffff;
  border-left: 1px solid #e9ecef;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.05);
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
}

.clear-btn {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
  padding: 6px 12px;
  font-size: 0.85rem;
  border-radius: 20px;
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
  transition: all 0.3s ease;
}

.clear-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.4);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.history-item {
  background: white;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid #e9ecef;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.history-item:hover {
  background: #f9f9f9;
  transform: translateX(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.history-item .time {
  font-size: 0.7rem;
  color: #6c757d;
}

.history-item .risk {
  font-size: 0.7rem;
  font-weight: bold;
  margin-top: 4px;
}

.history-item .summary {
  font-size: 0.8rem;
  margin-top: 4px;
  color: #495057;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-empty {
  text-align: center;
  color: #6c757d;
  padding: 20px;
  font-size: 0.9rem;
}

.report-card {
  background: #f8f9fa;
  border-left: 4px solid #667eea;
  border-radius: 12px;
  margin: 12px 0;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 6px;
}

.report-title {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
}

.report-time {
  font-size: 0.7rem;
  color: #6c757d;
  margin-left: 8px;
  font-weight: normal;
}

.report-actions {
  display: flex;
  gap: 6px;
}

.report-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0.6;
}

.report-btn:hover {
  opacity: 1;
  background: #e9ecef;
}

.report-body {
  margin: 8px 0;
}

.report-body.collapsed .report-details {
  display: none;
}

.report-body:not(.collapsed) .report-summary {
  display: none;
}

.report-summary, .report-details {
  line-height: 1.4;
}

.report-summary {
  font-style: italic;
  color: #495057;
}

.report-details p {
  margin: 6px 0;
}

.report-details ul {
  margin-left: 20px;
}

.report-footer {
  margin-top: 8px;
  text-align: right;
}

.continue-chat-btn {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.8rem;
  cursor: pointer;
}

.continue-chat-btn:hover {
  background: #4c6bd9;
}

.pagination {
  background: white;
  border-top: 1px solid #eee;
  padding: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.page-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.page-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: #6c757d;
}

@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }
  .history-sidebar {
    width: 100%;
    height: 300px;
    border-left: none;
    border-top: 1px solid #e9ecef;
  }
  .chat-main {
    height: calc(100vh - 300px);
  }
}

/* 暗黑模式样式 */
[data-theme="dark"] .sidebar {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

[data-theme="dark"] .nav-item {
  color: rgba(255, 255, 255, 0.9);
}

[data-theme="dark"] .nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

[data-theme="dark"] .nav-item.active {
  background: rgba(255, 255, 255, 0.25);
}

[data-theme="dark"] header {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
}

[data-theme="dark"] .chat-main,
[data-theme="dark"] .page-content {
  background: #1a1a2e;
}

[data-theme="dark"] .container {
  background: transparent;
}

[data-theme="dark"] .message {
  background: #16213e;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .user-message {
  background: #16213e;
  color: #eaeaea !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .assistant-message {
  background: #16213e;
  color: #eaeaea;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .input-area {
  background: #16213e;
  border-top-color: #2d3748;
}

[data-theme="dark"] .expandable-textarea {
  background: #1a1a2e;
  border-color: #2d3748;
  color: #eaeaea;
}

[data-theme="dark"] .expandable-textarea::placeholder {
  color: #888888;
}

[data-theme="dark"] .chat-container {
  scrollbar-color: #4a5568 #1a1a2e;
}

[data-theme="dark"] .chat-container::-webkit-scrollbar {
  width: 8px;
}

[data-theme="dark"] .chat-container::-webkit-scrollbar-track {
  background: #1a1a2e;
  border-radius: 10px;
}

[data-theme="dark"] .chat-container::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 10px;
}

[data-theme="dark"] .chat-container::-webkit-scrollbar-thumb:hover {
  background: #5a6578;
}

[data-theme="dark"] .report-card {
  background: #16213e;
  border-color: #2d3748;
}

[data-theme="dark"] .report-card h3 {
  color: #eaeaea;
}

[data-theme="dark"] .report-card p {
  color: #b8b8b8;
}

[data-theme="dark"] .report-meta {
  color: #888888;
}

[data-theme="dark"] .empty-state {
  background: #16213e;
  color: #b8b8b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .risk-badge {
  color: #eaeaea;
}

[data-theme="dark"] .community-card {
  background: #16213e;
  border-color: #2d3748;
}

[data-theme="dark"] .community-card h3 {
  color: #eaeaea;
}

[data-theme="dark"] .community-card p {
  color: #b8b8b8;
}

[data-theme="dark"] .post-meta {
  color: #888888;
}

[data-theme="dark"] .create-post-area {
  background: #16213e;
  border-color: #2d3748;
}

[data-theme="dark"] .create-post-area textarea,
[data-theme="dark"] .create-post-area select {
  background: #1a1a2e;
  border-color: #2d3748;
  color: #eaeaea;
}

[data-theme="dark"] .create-post-area textarea::placeholder {
  color: #888888;
}

/* 按钮暗色模式样式 - 强力覆盖 */
[data-theme="dark"] button {
  color: white !important;
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  box-shadow: 0 2px 6px rgba(74, 85, 104, 0.4) !important;
}

[data-theme="dark"] button:hover {
  box-shadow: 0 4px 10px rgba(74, 85, 104, 0.5) !important;
}

[data-theme="dark"] button.danger {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  box-shadow: 0 2px 6px rgba(74, 85, 104, 0.4) !important;
}

[data-theme="dark"] button.danger:hover {
  box-shadow: 0 4px 10px rgba(74, 85, 104, 0.5) !important;
}

[data-theme="dark"] button.warning {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  box-shadow: 0 2px 6px rgba(74, 85, 104, 0.4) !important;
}

[data-theme="dark"] button.warning:hover {
  box-shadow: 0 4px 10px rgba(74, 85, 104, 0.5) !important;
}

[data-theme="dark"] .clear-btn {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  box-shadow: 0 2px 6px rgba(74, 85, 104, 0.4) !important;
}

[data-theme="dark"] select {
  background: #16213e !important;
  border-color: #2d3748 !important;
  color: #eaeaea !important;
}

[data-theme="dark"] select:hover {
  border-color: #4a5568 !important;
  box-shadow: 0 0 0 3px rgba(74, 85, 104, 0.2) !important;
}

/* 社区帖子暗模式样�?*/
[data-theme="dark"] .community-post {
  background: #16213e !important;
  border-color: #2d3748 !important;
  color: #b8b8b8 !important;
}

[data-theme="dark"] .community-post .post-content {
  color: #b8b8b8 !important;
}

[data-theme="dark"] .community-post .post-meta {
  color: #888888 !important;
}

[data-theme="dark"] .community-post button {
  color: #b8b8b8 !important;
}

[data-theme="dark"] .community-post input {
  background: #1a1a2e !important;
  border-color: #2d3748 !important;
  color: #eaeaea !important;
}

[data-theme="dark"] .community-post input::placeholder {
  color: #888888 !important;
}

/* 发布帖子暗模式样�?*/
[data-theme="dark"] .post-create {
  background: #16213e !important;
  border-color: #2d3748 !important;
  color: #b8b8b8 !important;
}

[data-theme="dark"] .post-create h4 {
  color: #eaeaea !important;
}

[data-theme="dark"] .post-create textarea {
  background: #1a1a2e !important;
  border-color: #2d3748 !important;
  color: #eaeaea !important;
}

[data-theme="dark"] .post-create textarea::placeholder {
  color: #888888 !important;
}

[data-theme="dark"] .post-create select {
  background: #1a1a2e !important;
  border-color: #2d3748 !important;
  color: #eaeaea !important;
}

/* 报告中心暗模式样�?*/
[data-theme="dark"] .report-card {
  background: #16213e !important;
  border-color: #2d3748 !important;
  color: #b8b8b8 !important;
}

[data-theme="dark"] .report-card h3 {
  color: #eaeaea !important;
}

[data-theme="dark"] .report-card p {
  color: #b8b8b8 !important;
}

[data-theme="dark"] .search-input {
  background: #1a1a2e !important;
  border-color: #2d3748 !important;
  color: #eaeaea !important;
}

[data-theme="dark"] .search-input::placeholder {
  color: #888888 !important;
}

/* 搜索按钮 */
[data-theme="dark"] .search-btn {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  box-shadow: 0 2px 6px rgba(74, 85, 104, 0.4) !important;
}

/* 输入展开按钮 */
[data-theme="dark"] .input-expand-btn {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  color: #eaeaea !important;
}

/* 处理所有有内联样式的元�?- 全部使用深色渐变 */
[data-theme="dark"] [style*="rgb(102, 126, 234)"],
[data-theme="dark"] [style*="rgb(76, 175, 80)"],
[data-theme="dark"] [style*="rgb(244, 67, 54)"] {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%) !important;
  box-shadow: 0 2px 6px rgba(74, 85, 104, 0.4) !important;
}

/* 管理员认证弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #666;
}

.modal-body {
  padding: 24px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-form label {
  font-size: 1rem;
  font-weight: 500;
  color: #34495e;
}

.auth-form input[type="password"] {
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.auth-form input[type="password"]:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  margin: 0;
  color: #f44336;
  font-size: 0.9rem;
}

.auth-form .submit-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.auth-form .submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

/* 暗色模式下的弹窗样式 */
[data-theme="dark"] .modal-content {
  background: #16213e;
  border: 1px solid #2d3748;
}

[data-theme="dark"] .modal-header {
  border-bottom-color: #2d3748;
}

[data-theme="dark"] .modal-header h2 {
  color: #eaeaea;
}

[data-theme="dark"] .close-btn:hover {
  background: #2d3748;
}

[data-theme="dark"] .auth-form label {
  color: #eaeaea;
}

[data-theme="dark"] .auth-form input[type="password"] {
  background: #1a1a2e;
  border-color: #2d3748;
  color: #eaeaea;
}

[data-theme="dark"] .auth-form input[type="password"]:focus {
  border-color: #4a5568;
  box-shadow: 0 0 0 3px rgba(74, 85, 104, 0.2);
}

[data-theme="dark"] .auth-form .submit-btn {
  background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
  box-shadow: 0 4px 12px rgba(74, 85, 104, 0.3);
}

[data-theme="dark"] .auth-form .submit-btn:hover {
  box-shadow: 0 6px 16px rgba(74, 85, 104, 0.4);
}
</style>
