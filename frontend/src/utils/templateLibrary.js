const STORAGE_KEY = 'user_feature_templates'
const MAX_TEMPLATES = 10

let templates = []

function loadTemplates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      templates = JSON.parse(stored)
    } else {
      templates = []
    }
  } catch (e) {
    console.error('Failed to load templates:', e)
    templates = []
  }
}

function saveTemplates() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch (e) {
    console.error('Failed to save templates:', e)
  }
}

loadTemplates()

export const templateLibrary = {
  getAllTemplates() {
    return [...templates]
  },

  getTemplate(id) {
    return templates.find(t => t.id === id) || null
  },

  addTemplate(template) {
    if (!template || !template.id) {
      throw new Error('模板必须包含 id')
    }

    if (templates.length >= MAX_TEMPLATES) {
      const oldest = templates.reduce((prev, curr) => 
        prev.createdAt < curr.createdAt ? prev : curr
      )
      this.deleteTemplate(oldest.id)
    }

    const existing = templates.find(t => t.id === template.id)
    if (existing) {
      this.updateTemplate(template.id, template)
    } else {
      templates.push(template)
      saveTemplates()
    }
  },

  updateTemplate(id, updates) {
    const index = templates.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error(`模板 ${id} 不存在`)
    }

    templates[index] = { ...templates[index], ...updates }
    saveTemplates()
  },

  deleteTemplate(id) {
    const index = templates.findIndex(t => t.id === id)
    if (index !== -1) {
      templates.splice(index, 1)
      saveTemplates()
      return true
    }
    return false
  },

  updateTemplateLastUsed(id) {
    this.updateTemplate(id, { lastUsedAt: Date.now() })
  },

  clearAll() {
    templates = []
    saveTemplates()
  },

  getStats() {
    return {
      total: templates.length,
      max: MAX_TEMPLATES,
      oldest: templates.length > 0 ? templates.reduce((prev, curr) => 
        prev.createdAt < curr.createdAt ? prev : curr
      ) : null,
      newest: templates.length > 0 ? templates.reduce((prev, curr) => 
        prev.createdAt > curr.createdAt ? prev : curr
      ) : null
    }
  },

  cleanupOldTemplates(daysToKeep = 30) {
    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)
    const beforeCount = templates.length
    
    templates = templates.filter(t => t.lastUsedAt > cutoff)
    saveTemplates()
    
    return {
      removed: beforeCount - templates.length,
      remaining: templates.length
    }
  },

  exportTemplates() {
    return JSON.stringify(templates, null, 2)
  },

  importTemplates(jsonString) {
    try {
      const imported = JSON.parse(jsonString)
      if (!Array.isArray(imported)) {
        throw new Error('导入数据必须是数组')
      }
      
      imported.forEach(template => {
        if (template.id) {
          this.addTemplate(template)
        }
      })
      
      return { success: true, count: imported.length }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }
}

export function generateTemplateId() {
  return 'template-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9)
}

export function createTemplate(featureVector, preferences, contextSummary = null) {
  return {
    id: generateTemplateId(),
    featureVector: [...featureVector],
    preferences: { ...preferences },
    contextSummary: contextSummary || null,
    createdAt: Date.now(),
    lastUsedAt: Date.now()
  }
}
