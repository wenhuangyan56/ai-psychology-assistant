import { reactive } from 'vue'
import axios from 'axios'
import { extractFeatures, setUserPreferences, startInput, endInput, recordResponseReceived } from '../utils/featureExtractor'
import { findBestMatch, setConfig as setMatcherConfig } from '../utils/featureMatcher'
import { templateLibrary, createTemplate } from '../utils/templateLibrary'

const STORAGE_KEYS = {
  ANONYMOUS_ID: 'anonymous_user_id',
  CURRENT_STATE: 'user_recognition_state',
  MATCHED_TEMPLATE_ID: 'matched_template_id',
  MATCHING_THRESHOLD: 'matching_threshold',
  CURRENT_USER_ID: 'psych_user_id'
}

const STATES = {
  INACTIVE: 'inactive',
  SILENT_COLLECTION: 'silent_collection',
  MATCHING_ATTEMPT: 'matching_attempt',
  SERVER_MATCHING: 'server_matching',
  MATCHED: 'matched',
  NEW_USER: 'new_user',
  CONFIRMING_RESTORE: 'confirming_restore',
  NEW_USER_PERSISTENT: 'new_user_persistent',
  ASKING_TO_SAVE: 'asking_to_save'
}

const CONFIG = {
  SILENT_COLLECTION_ROUNDS: 5,
  NEW_USER_SAVE_THRESHOLD: 5,
  MATCHING_THRESHOLD: 0.85,
  MAX_TEMPLATES: 10,
  MIN_ROUNDS_FOR_MATCHING: 5
}

export const userRecognition = reactive({
  state: STATES.INACTIVE,
  anonymousId: null,
  currentMatchId: null,
  matchConfidence: 0,
  featureBuffer: [],
  conversationRounds: 0,
  preferences: {
    empathyStyle: 'warm',
    topics: [],
    language: 'zh',
    theme: 'light',
    model: 'auto'
  },
  contextSummary: null,
  lastStateChange: null,
  showRestoreConfirm: false,
  pendingTemplateToSave: null,
  currentUserId: null,
  isServerMatched: false
})

let stateChangeCallbacks = []

export function registerStateChangeCallback(callback) {
  stateChangeCallbacks.push(callback)
  return () => {
    const index = stateChangeCallbacks.indexOf(callback)
    if (index > -1) stateChangeCallbacks.splice(index, 1)
  }
}

function notifyStateChange(oldState, newState) {
  stateChangeCallbacks.forEach(cb => cb({ oldState, newState, ...userRecognition }))
}

export async function initUserRecognition() {
  const savedAnonymousId = localStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID)
  const savedState = localStorage.getItem(STORAGE_KEYS.CURRENT_STATE)
  const savedMatchId = localStorage.getItem(STORAGE_KEYS.MATCHED_TEMPLATE_ID)
  const savedThreshold = localStorage.getItem(STORAGE_KEYS.MATCHING_THRESHOLD)

  if (savedAnonymousId) {
    userRecognition.anonymousId = savedAnonymousId
  } else {
    userRecognition.anonymousId = generateUUID()
    localStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, userRecognition.anonymousId)
  }

  if (savedThreshold) {
    setMatcherConfig({ threshold: parseFloat(savedThreshold) })
  }

  userRecognition.currentUserId = null
  userRecognition.isServerMatched = false

  transitionToState(STATES.INACTIVE)
}

async function tryServerMatching() {
  try {
    const templates = await axios.get('/user_templates')
    if (templates.data.templates && templates.data.templates.length > 0) {
      transitionToState(STATES.SERVER_MATCHING)
      
      const featureVector = await extractFeaturesFromRecentReports()
      
      if (featureVector && featureVector.length > 0) {
        const response = await axios.post('/identify_user', {
          feature_vector: featureVector,
          min_rounds: CONFIG.MIN_ROUNDS_FOR_MATCHING
        })
        
        if (response.data.matched && response.data.user_id) {
          userRecognition.currentUserId = response.data.user_id
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, response.data.user_id)
          userRecognition.matchConfidence = response.data.similarity
          userRecognition.isServerMatched = true
          
          if (response.data.preferences) {
            userRecognition.preferences = { ...response.data.preferences }
            setUserPreferences(userRecognition.preferences)
          }
          
          userRecognition.contextSummary = response.data.context_summary
          transitionToState(STATES.MATCHED)
          return
        }
      }
    }
  } catch (error) {
    console.warn('Server matching failed, falling back to local recognition:', error)
  }
}

async function extractFeaturesFromRecentReports() {
  try {
    const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)
    
    let response
    if (userId) {
      response = await axios.get('/reports', {
        params: { user_id: userId }
      })
    } else {
      response = await axios.get('/reports', {
        params: { limit: 1 }
      })
    }
    
    if (!response.data || response.data.length === 0) return null
    
    const recentReport = response.data[0]
    if (!recentReport.text) return null
    
    const reportData = JSON.parse(recentReport.text)
    if (!reportData.chat_history || reportData.chat_history.length < CONFIG.MIN_ROUNDS_FOR_MATCHING) {
      return null
    }
    
    const featureResponse = await axios.post('/extract_features', {
      messages: reportData.chat_history
    })
    
    return featureResponse.data.feature_vector
  } catch (error) {
    console.warn('Failed to extract features from reports:', error)
    return null
  }
}

function generateUUID() {
  return 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9)
}

function transitionToState(newState) {
  const oldState = userRecognition.state
  userRecognition.state = newState
  userRecognition.lastStateChange = Date.now()
  localStorage.setItem(STORAGE_KEYS.CURRENT_STATE, newState)
  notifyStateChange(oldState, newState)
}

export function handleInputStart() {
  startInput()
}

export function handleInputEnd() {
  endInput()
}

export function handleResponseReceived() {
  recordResponseReceived()
}

export async function handleNewMessage(userMessage, systemResponse) {
  userRecognition.conversationRounds++
  
  if (userRecognition.state === STATES.INACTIVE) {
    if (userRecognition.conversationRounds === 1) {
      transitionToState(STATES.SILENT_COLLECTION)
    }
  }

  if (userRecognition.state === STATES.SILENT_COLLECTION) {
    const features = extractFeatures(userMessage, systemResponse)
    userRecognition.featureBuffer.push(features)
  }

  if (userRecognition.state === STATES.MATCHED) {
    updateCurrentTemplate(userMessage, systemResponse)
  }

  if (userRecognition.state === STATES.NEW_USER_PERSISTENT || 
      userRecognition.state === STATES.MATCHING_ATTEMPT ||
      userRecognition.state === STATES.SILENT_COLLECTION) {
    if (userRecognition.conversationRounds >= CONFIG.NEW_USER_SAVE_THRESHOLD && 
        !userRecognition.pendingTemplateToSave) {
      transitionToState(STATES.ASKING_TO_SAVE)
    }
  }
}

export async function performMatchingAtEnd() {
  if (userRecognition.featureBuffer.length === 0) {
    return { matched: false, user_id: null }
  }

  const mergedVector = mergeFeatureVectors(userRecognition.featureBuffer)
  
  try {
    const response = await axios.post('/identify_user', {
      feature_vector: mergedVector,
      min_rounds: CONFIG.MIN_ROUNDS_FOR_MATCHING
    })
    
    if (response.data.matched && response.data.user_id) {
      const similarity = response.data.similarity
      const matchedUserId = response.data.user_id
      
      // 询问用户是否切换到匹配的用户
      const useMatchedUser = confirm(
        `检测到您的使用习惯与已有用户匹配度达到 ${Math.round(similarity * 100)}%！\n\n` +
        `是否切换到该用户身份？这样可以查看该用户的历史报告。`
      )
      
      if (useMatchedUser) {
        userRecognition.currentUserId = matchedUserId
        userRecognition.matchConfidence = similarity
        userRecognition.isServerMatched = true
        
        if (response.data.preferences) {
          userRecognition.preferences = { ...response.data.preferences }
          setUserPreferences(userRecognition.preferences)
        }
        
        userRecognition.contextSummary = response.data.context_summary
        transitionToState(STATES.MATCHED)
        return { matched: true, user_id: matchedUserId, similarity: similarity }
      }
    }
  } catch (error) {
    console.warn('Server matching failed:', error)
  }

  userRecognition.matchConfidence = 0
  transitionToState(STATES.NEW_USER)
  return { matched: false, user_id: null }
}

export function resetRecognition() {
  userRecognition.state = STATES.INACTIVE
  userRecognition.conversationRounds = 0
  userRecognition.featureBuffer = []
  userRecognition.currentUserId = null
  userRecognition.matchConfidence = 0
  userRecognition.isServerMatched = false
}

async function performMatching() {
  if (userRecognition.featureBuffer.length === 0) {
    return
  }

  const mergedVector = mergeFeatureVectors(userRecognition.featureBuffer)
  
  try {
    const response = await axios.post('/identify_user', {
      feature_vector: mergedVector,
      min_rounds: CONFIG.MIN_ROUNDS_FOR_MATCHING
    })
    
    if (response.data.matched && response.data.user_id) {
      userRecognition.currentUserId = response.data.user_id
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, response.data.user_id)
      userRecognition.matchConfidence = response.data.similarity
      userRecognition.isServerMatched = true
      
      if (response.data.preferences) {
        userRecognition.preferences = { ...response.data.preferences }
        setUserPreferences(userRecognition.preferences)
      }
      
      userRecognition.contextSummary = response.data.context_summary
      transitionToState(STATES.MATCHED)
      return
    }
  } catch (error) {
    console.warn('Server matching failed, trying local matching:', error)
  }

  const templates = templateLibrary.getAllTemplates()
  
  if (templates.length === 0) {
    userRecognition.matchConfidence = 0
    transitionToState(STATES.NEW_USER)
    return
  }

  const result = findBestMatch(mergedVector, templates)
  
  userRecognition.matchConfidence = result.similarity

  if (result.isAboveThreshold && result.template) {
    userRecognition.currentMatchId = result.template.id
    localStorage.setItem(STORAGE_KEYS.MATCHED_TEMPLATE_ID, result.template.id)
    
    if (result.template.contextSummary) {
      userRecognition.showRestoreConfirm = true
      transitionToState(STATES.CONFIRMING_RESTORE)
    } else {
      transitionToState(STATES.MATCHED)
      loadTemplatePreferences(result.template)
    }
    
    templateLibrary.updateTemplateLastUsed(result.template.id)
  } else {
    transitionToState(STATES.NEW_USER)
  }
}

export function confirmRestoreContext(confirmed) {
  if (confirmed && userRecognition.currentMatchId) {
    const template = templateLibrary.getTemplate(userRecognition.currentMatchId)
    if (template && template.contextSummary) {
      userRecognition.contextSummary = template.contextSummary
    }
  }
  
  userRecognition.showRestoreConfirm = false
  loadTemplatePreferences(templateLibrary.getTemplate(userRecognition.currentMatchId))
  transitionToState(STATES.MATCHED)
}

function mergeFeatureVectors(vectors) {
  if (vectors.length === 0) return []
  
  const dimensions = vectors[0].length
  const merged = new Array(dimensions).fill(0)
  
  vectors.forEach(vec => {
    vec.forEach((val, idx) => {
      merged[idx] += val
    })
  })
  
  return merged.map(val => val / vectors.length)
}

function loadTemplatePreferences(template) {
  if (!template) return
  
  userRecognition.preferences = { ...template.preferences }
  setUserPreferences(userRecognition.preferences)
}

function updateCurrentTemplate(userMessage, systemResponse) {
  if (!userRecognition.currentMatchId) return
  
  const template = templateLibrary.getTemplate(userRecognition.currentMatchId)
  if (!template) return

  const newFeatures = extractFeatures(userMessage, systemResponse)
  const updatedVector = mergeFeatureVectors([template.featureVector, newFeatures])
  
  templateLibrary.updateTemplate(userRecognition.currentMatchId, {
    featureVector: updatedVector,
    lastUsedAt: Date.now()
  })
}

export async function saveUserToServer(userId, featureVector, preferences = {}, contextSummary = '') {
  try {
    await axios.post('/user_template', {
      user_id: userId,
      feature_vector: featureVector,
      preferences: preferences,
      context_summary: contextSummary
    })
    return true
  } catch (error) {
    console.error('Failed to save user template to server:', error)
    return false
  }
}

export async function promptSaveAsNewUser() {
  return new Promise((resolve) => {
    const confirmed = window.confirm(
      '是否保存当前使用习惯，以便下次更快识别？\n\n数据仅保存在本机浏览器中，不会上传到服务器。'
    )
    
    if (confirmed) {
      saveAsNewUser()
      userRecognition.pendingTemplateToSave = null
      resolve(true)
    } else {
      userRecognition.pendingTemplateToSave = null
      resolve(false)
    }
  })
}

function saveAsNewUser() {
  if (userRecognition.featureBuffer.length === 0) return
  
  const mergedVector = mergeFeatureVectors(userRecognition.featureBuffer)
  const newTemplate = createTemplate(mergedVector, userRecognition.preferences)
  
  templateLibrary.addTemplate(newTemplate)
  
  if (userRecognition.currentUserId) {
    saveUserToServer(
      userRecognition.currentUserId, 
      mergedVector, 
      userRecognition.preferences,
      userRecognition.contextSummary
    )
  }
}

export function setMatchingThreshold(threshold) {
  if (threshold >= 0.75 && threshold <= 0.95) {
    setMatcherConfig({ threshold })
    localStorage.setItem(STORAGE_KEYS.MATCHING_THRESHOLD, threshold.toString())
    return true
  }
  return false
}

export function clearLocalData() {
  localStorage.removeItem(STORAGE_KEYS.ANONYMOUS_ID)
  localStorage.removeItem(STORAGE_KEYS.CURRENT_STATE)
  localStorage.removeItem(STORAGE_KEYS.MATCHED_TEMPLATE_ID)
  localStorage.removeItem(STORAGE_KEYS.MATCHING_THRESHOLD)
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID)
  
  templateLibrary.clearAll()
  
  userRecognition.state = STATES.INACTIVE
  userRecognition.anonymousId = null
  userRecognition.currentMatchId = null
  userRecognition.matchConfidence = 0
  userRecognition.featureBuffer = []
  userRecognition.conversationRounds = 0
  userRecognition.preferences = {
    empathyStyle: 'warm',
    topics: [],
    language: 'zh',
    theme: 'light',
    model: 'auto'
  }
  userRecognition.contextSummary = null
  userRecognition.showRestoreConfirm = false
  userRecognition.pendingTemplateToSave = null
  userRecognition.currentUserId = null
  userRecognition.isServerMatched = false
  
  initUserRecognition()
}

export function getCurrentState() {
  return userRecognition.state
}

export function getUserRecognitionState() {
  return { ...userRecognition }
}

export function getStateDescription(state) {
  const descriptions = {
    [STATES.INACTIVE]: '初始状态 - 等待用户开始对话',
    [STATES.SILENT_COLLECTION]: '静默采集 - 正在收集行为特征',
    [STATES.MATCHING_ATTEMPT]: '匹配尝试 - 正在比对特征模板',
    [STATES.SERVER_MATCHING]: '服务器匹配 - 正在与服务器比对',
    [STATES.MATCHED]: '已匹配 - 已识别到返回用户',
    [STATES.NEW_USER]: '新用户 - 创建新用户标识',
    [STATES.CONFIRMING_RESTORE]: '确认恢复 - 询问是否恢复上下文',
    [STATES.NEW_USER_PERSISTENT]: '新用户持久化 - 可保存用户偏好',
    [STATES.ASKING_TO_SAVE]: '询问保存 - 是否保存为新模板'
  }
  return descriptions[state] || state
}

export function getAllTemplates() {
  return templateLibrary.getAllTemplates()
}

export function deleteTemplate(id) {
  const success = templateLibrary.deleteTemplate(id)
  if (id === userRecognition.currentMatchId) {
    userRecognition.currentMatchId = null
    localStorage.removeItem(STORAGE_KEYS.MATCHED_TEMPLATE_ID)
    transitionToState(STATES.NEW_USER_PERSISTENT)
  }
  return success
}

export function exportTemplates() {
  return templateLibrary.exportTemplates()
}

export function importTemplates(jsonString) {
  return templateLibrary.importTemplates(jsonString)
}

export function getTemplateStats() {
  return templateLibrary.getStats()
}

export function getCurrentUserId() {
  return userRecognition.currentUserId || localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)
}

export function setCurrentUserId(userId) {
  userRecognition.currentUserId = userId
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId)
}

export { STATES, CONFIG }
