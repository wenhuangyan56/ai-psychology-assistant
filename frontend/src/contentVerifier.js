import { getForbiddenTexts } from './corpus.js';

// TF-IDF向量化
const tokenize = (text) => {
  return text.toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 0);
};

// 计算TF
const computeTF = (tokens) => {
  const tf = {};
  const total = tokens.length;
  
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  
  Object.keys(tf).forEach(key => {
    tf[key] = tf[key] / total;
  });
  
  return tf;
};

// 计算IDF
const computeIDF = (documents) => {
  const idf = {};
  const N = documents.length;
  const docFreq = {};
  
  documents.forEach(doc => {
    const tokens = new Set(tokenize(doc));
    tokens.forEach(token => {
      docFreq[token] = (docFreq[token] || 0) + 1;
    });
  });
  
  Object.keys(docFreq).forEach(token => {
    idf[token] = Math.log(N / docFreq[token]) + 1;
  });
  
  return idf;
};

// 计算TF-IDF向量
const computeTFIDF = (text, idf) => {
  const tokens = tokenize(text);
  const tf = computeTF(tokens);
  const tfidf = {};
  
  Object.keys(tf).forEach(token => {
    tfidf[token] = tf[token] * (idf[token] || 0);
  });
  
  return tfidf;
};

// 计算向量范数
const vectorNorm = (vec) => {
  return Math.sqrt(Object.values(vec).reduce((sum, val) => sum + val * val, 0));
};

// 计算余弦相似度
const cosineSimilarity = (vec1, vec2) => {
  const allTokens = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  
  let dotProduct = 0;
  allTokens.forEach(token => {
    dotProduct += (vec1[token] || 0) * (vec2[token] || 0);
  });
  
  const norm1 = vectorNorm(vec1);
  const norm2 = vectorNorm(vec2);
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (norm1 * norm2);
};

// 语义相似度审核
export const semanticSimilarityCheck = (userText, threshold = 0.8) => {
  const forbiddenTexts = getForbiddenTexts();
  
  if (!userText || !userText.trim() || forbiddenTexts.length === 0) {
    return {
      isRisky: false,
      mostSimilar: null,
      score: 0
    };
  }
  
  // 计算IDF
  const allTexts = [userText, ...forbiddenTexts];
  const idf = computeIDF(allTexts);
  
  // 计算用户文本的TF-IDF
  const userVector = computeTFIDF(userText, idf);
  
  // 计算与每条违禁文本的相似度
  let maxScore = 0;
  let mostSimilar = null;
  
  forbiddenTexts.forEach(forbiddenText => {
    const forbiddenVector = computeTFIDF(forbiddenText, idf);
    const score = cosineSimilarity(userVector, forbiddenVector);
    
    if (score > maxScore) {
      maxScore = score;
      mostSimilar = forbiddenText;
    }
  });
  
  return {
    isRisky: maxScore >= threshold,
    mostSimilar,
    score: Math.round(maxScore * 100) / 100
  };
};

// 审核函数
export const verifyContent = (text) => {
  const threshold = 0.8;
  const result = semanticSimilarityCheck(text, threshold);
  
  return {
    passed: !result.isRisky,
    score: result.score,
    similar: result.mostSimilar,
    message: result.isRisky 
      ? `内容相似度 ${result.score * 100}% 超过阈值 ${threshold * 100}%，禁止发送`
      : '内容审核通过'
  };
};
