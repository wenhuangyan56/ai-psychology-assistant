import * as XLSX from 'xlsx';

// 同步读取语料库文件
let forbiddenTexts = [
  // 默认违禁词列表
  '自杀', '自虐', '自残', '想死', '活不下去', '结束生命',
  '跳楼', '割腕', '服药', '上吊', '痛苦', '绝望',
  '崩溃', '撑不下去', '没有希望', '生无可恋', '厌世'
];

// 初始化加载语料库
export const loadCorpus = async () => {
  try {
    const response = await fetch('/src/corpus.xlsx');
    if (!response.ok) {
      console.log('语料库文件不存在，使用默认违禁词列表');
      return true;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    // 获取第一个sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 转换为JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // 提取第一列内容（假设违禁词在第一列）
    const loadedTexts = data.map(row => row[0]).filter(text => text && typeof text === 'string');
    
    if (loadedTexts.length > 0) {
      forbiddenTexts = loadedTexts;
      console.log(`语料库加载成功，共 ${forbiddenTexts.length} 条记录`);
    } else {
      console.log('语料库文件为空，使用默认违禁词列表');
    }
    return true;
  } catch (error) {
    console.log('语料库加载失败，使用默认违禁词列表:', error.message);
    return true;
  }
};

// 获取违禁词语料库
export const getForbiddenTexts = () => forbiddenTexts;

// 设置违禁词语料库（用于手动设置）
export const setForbiddenTexts = (texts) => {
  forbiddenTexts = texts;
};
