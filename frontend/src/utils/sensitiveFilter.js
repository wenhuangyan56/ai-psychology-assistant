const sensitivePatterns = [
  {
    name: '身份证号',
    pattern: /[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
    replacement: '[身份证号]'
  },
  {
    name: '邮箱',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[邮箱]'
  },
  {
    name: 'IP地址',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: '[IP地址]'
  },
  {
    name: '微信号',
    pattern: /wxid_[a-zA-Z0-9]+/g,
    replacement: '[联系方式]'
  },
  {
    name: '银行卡号',
    pattern: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
    replacement: '[银行卡号]'
  },
  {
    name: '座机号码',
    pattern: /\b\d{3,4}[- ]?\d{7,8}\b/g,
    replacement: '[电话号码]'
  },
  {
    name: '手机号',
    pattern: /\b1[3-9]\d{9}\b/g,
    replacement: '[手机号]'
  },
  {
    name: 'QQ号',
    pattern: /\b[1-9][0-9]{4,12}\b/g,
    replacement: '[联系方式]'
  },
  {
    name: '住址',
    pattern: /([一二三四五六七八九十百千万0-9]+[小区|花园|公寓|大厦|楼|栋|单元|室|号|路|街|巷|弄][一二三四五六七八九十百千万0-9栋单元室号路街道]*)/g,
    replacement: '[住址]'
  },
  {
    name: '带描述的号码',
    pattern: /(电话|手机|联系|号码)[号:]?(?:\s*是\s*)?(\d{4,15})/gi,
    replacement: '[号码]'
  },
  {
    name: '短号码',
    pattern: /\b(10086|10010|10000|110|120|119|96110|12345)\b/g,
    replacement: '[号码]'
  }
];

export function filterSensitiveInfo(text) {
  if (!text || typeof text !== 'string') {
    return {
      filteredText: text,
      hasSensitiveInfo: false,
      detectedTypes: []
    };
  }

  let result = text;
  const detectedTypes = [];

  for (const { name, pattern, replacement } of sensitivePatterns) {
    const matches = result.match(pattern);
    if (matches && matches.length > 0) {
      detectedTypes.push(name);
      result = result.replace(pattern, replacement);
    }
  }

  return {
    filteredText: result,
    hasSensitiveInfo: detectedTypes.length > 0,
    detectedTypes
  };
}

export function detectSensitiveInfo(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detectedTypes = [];

  for (const { name, pattern } of sensitivePatterns) {
    if (pattern.test(text)) {
      detectedTypes.push(name);
    }
  }

  return detectedTypes;
}