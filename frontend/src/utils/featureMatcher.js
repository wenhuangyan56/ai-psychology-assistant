const DEFAULT_CONFIG = {
  threshold: 0.90,
  minThreshold: 0.75,
  maxThreshold: 0.95,
  preferenceWeightBoost: 1.2,
  useDistanceAsTiebreaker: true,
  tiebreakerThreshold: 0.01
}

let config = { ...DEFAULT_CONFIG }

export function setConfig(newConfig) {
  config = { ...config, ...newConfig }
}

export function getConfig() {
  return { ...config }
}

export function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0
  }
  
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    magnitude1 += vec1[i] * vec1[i]
    magnitude2 += vec2[i] * vec2[i]
  }
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0
  }
  
  return Math.round((dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2))) * 100) / 100
}

export function euclideanDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return Infinity
  }
  
  let sum = 0
  for (let i = 0; i < vec1.length; i++) {
    sum += Math.pow(vec1[i] - vec2[i], 2)
  }
  
  return Math.sqrt(sum)
}

export function manhattanDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return Infinity
  }
  
  let sum = 0
  for (let i = 0; i < vec1.length; i++) {
    sum += Math.abs(vec1[i] - vec2[i])
  }
  
  return sum
}

const FEATURE_GROUP_WEIGHTS = {
  LANGUAGE_STYLE: 0.5,
  INTERACTION_BEHAVIOR: 0.3,
  PREFERENCE_SETTINGS: 0.2
}

const FEATURE_GROUP_DIMENSIONS = {
  LANGUAGE_STYLE: { start: 0, count: 5 },
  INTERACTION_BEHAVIOR: { start: 5, count: 4 },
  PREFERENCE_SETTINGS: { start: 9, count: 4 }
}

export function calculateGroupWeightedSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0
  }
  
  let totalWeightedSimilarity = 0
  let totalWeight = 0
  
  Object.entries(FEATURE_GROUP_DIMENSIONS).forEach(([group, { start, count }]) => {
    let weight = FEATURE_GROUP_WEIGHTS[group]
    const groupVec1 = vec1.slice(start, start + count)
    const groupVec2 = vec2.slice(start, start + count)
    
    const groupSimilarity = cosineSimilarity(groupVec1, groupVec2)
    
    if (group === 'PREFERENCE_SETTINGS' && config.preferenceWeightBoost) {
      weight *= config.preferenceWeightBoost
    }
    
    totalWeightedSimilarity += groupSimilarity * weight
    totalWeight += weight
  })
  
  if (totalWeight === 0) return 0
  
  return Math.round((totalWeightedSimilarity / totalWeight) * 100) / 100
}

export function calculateCombinedScore(vec1, vec2) {
  const cosine = calculateGroupWeightedSimilarity(vec1, vec2)
  
  if (!config.useDistanceAsTiebreaker) {
    return { similarity: cosine, distance: null }
  }
  
  const euclidean = euclideanDistance(vec1, vec2)
  
  return {
    similarity: cosine,
    distance: euclidean,
    combined: cosine - (euclidean / vec1.length) * 0.1
  }
}

export function matchTemplate(currentVector, templateVector) {
  const result = calculateCombinedScore(currentVector, templateVector)
  return result.similarity
}

export function findBestMatch(currentVector, templates) {
  if (!currentVector || !templates || templates.length === 0) {
    return { template: null, similarity: 0, isAboveThreshold: false }
  }
  
  let bestTemplate = null
  let highestSimilarity = 0
  let bestDistance = Infinity
  const candidates = []
  
  templates.forEach(template => {
    const { similarity, distance } = calculateCombinedScore(currentVector, template.featureVector)
    
    if (similarity >= config.threshold) {
      candidates.push({ template, similarity, distance })
    }
    
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity
      bestTemplate = template
      bestDistance = distance
    } else if (Math.abs(similarity - highestSimilarity) < config.tiebreakerThreshold) {
      if (distance < bestDistance) {
        highestSimilarity = similarity
        bestTemplate = template
        bestDistance = distance
      } else if (distance === bestDistance) {
        if (template.lastUsedAt > bestTemplate.lastUsedAt) {
          bestTemplate = template
        }
      }
    }
  })
  
  if (candidates.length > 1) {
    candidates.sort((a, b) => {
      if (Math.abs(a.similarity - b.similarity) >= config.tiebreakerThreshold) {
        return b.similarity - a.similarity
      }
      if (a.distance !== b.distance) {
        return a.distance - b.distance
      }
      return b.template.lastUsedAt - a.template.lastUsedAt
    })
    
    bestTemplate = candidates[0].template
    highestSimilarity = candidates[0].similarity
  }
  
  return {
    template: bestTemplate,
    similarity: highestSimilarity,
    isAboveThreshold: highestSimilarity >= config.threshold,
    candidates: candidates
  }
}

export function validateVector(vector, expectedLength = 13) {
  if (!vector || !Array.isArray(vector)) {
    return { valid: false, error: '向量必须是数组' }
  }
  
  if (vector.length !== expectedLength) {
    return { valid: false, error: `向量长度应为 ${expectedLength}，实际为 ${vector.length}` }
  }
  
  for (let i = 0; i < vector.length; i++) {
    if (typeof vector[i] !== 'number' || isNaN(vector[i])) {
      return { valid: false, error: `第 ${i} 个元素不是有效数字` }
    }
    
    if (vector[i] < 0 || vector[i] > 1) {
      return { valid: false, error: `第 ${i} 个元素超出范围 [0, 1]` }
    }
  }
  
  return { valid: true, error: null }
}

export function isValidThreshold(value) {
  return typeof value === 'number' && value >= config.minThreshold && value <= config.maxThreshold
}

export { FEATURE_GROUP_WEIGHTS, FEATURE_GROUP_DIMENSIONS, DEFAULT_CONFIG }
