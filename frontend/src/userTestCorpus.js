/**
 * 用户识别测试语料库
 * 包含不同年龄段用户的典型语言表达
 */

// 初中生（12-15岁）的语言特征：
// - 常用网络流行语
// - 句子较短，表达直接
// - 使用表情符号
// - 关注学习、游戏、朋友等话题

export const middleSchoolStudent = {
  userId: 'middle-school-student',
  name: '初中生',
  messages: [
    '今天考试又没考好，好烦啊！',
    '老师布置的作业太多了，写到现在还没写完',
    '昨天和同学去打篮球，我投中了好几个三分球！',
    '最近在玩那个新出的游戏，超好玩的！',
    '妈妈又说我玩手机时间太长了，可是我才玩了一小时',
    '数学老师好严厉啊，作业写错一点就批评',
    '周末想去看电影，有没有人一起？',
    '今天体育课跑步跑了800米，累死人了',
    '同桌总是上课说话，影响我学习',
    '明天要交英语作文，还没开始写呢',
    '王者荣耀新赛季开始了，有没有大佬带带我？',
    '最近喜欢上了一个明星，好帅啊！',
    '作业好多啊，什么时候才能写完',
    '今天被老师表扬了，开心！',
    '好想快点放假，天天上课好无聊'
  ],
  characteristics: {
    vocabulary: ['考试', '作业', '游戏', '同学', '老师', '手机', '体育课', '电影', '明星', '放假'],
    sentenceLength: { short: 8, medium: 7, long: 0 },
    punctuation: { comma: 5, period: 10, exclamation: 5, question: 2, colon: 0, semicolon: 0 },
    emojiUsage: []
  }
}

// 中年人（30-40岁）的语言特征：
// - 表达较为成熟稳重
// - 关注工作、家庭、健康等话题
// - 句子结构较完整
// - 使用较少表情符号

export const middleAgedAdult = {
  userId: 'middle-aged-adult',
  name: '中年人',
  messages: [
    '最近工作压力有点大，项目deadline快到了',
    '孩子最近学习成绩有所提升，作为家长感到很欣慰',
    '周末打算带家人去郊外放松一下，缓解一周的疲惫',
    '体检报告出来了，医生说需要注意饮食和锻炼',
    '今天和老同学聚会，聊起了很多往事',
    '公司最近在进行组织架构调整，不知道会有什么变化',
    '父母年纪大了，身体状况需要特别关注',
    '最近在读一本关于心理学的书，收获很多',
    '房贷压力不小，需要合理规划家庭开支',
    '孩子学校要开家长会，得提前安排好工作',
    '最近睡眠质量不太好，可能需要调整作息时间',
    '和妻子商量着要换一辆新车，正在对比各种车型',
    '工作上遇到了一些挑战，需要好好思考解决方案',
    '周末去看望了父母，他们身体还不错',
    '最近开始学习烹饪，希望能给家人做些可口的饭菜'
  ],
  characteristics: {
    vocabulary: ['工作', '压力', '家庭', '孩子', '父母', '健康', '学习', '房贷', '睡眠', '烹饪'],
    sentenceLength: { short: 3, medium: 10, long: 2 },
    punctuation: { comma: 8, period: 15, exclamation: 0, question: 1, colon: 0, semicolon: 0 },
    emojiUsage: []
  }
}

// 老年人（70-80岁）的语言特征：
// - 语速较慢，表达较啰嗦
// - 关注健康、子女、回忆等话题
// - 使用较多的语气词
// - 句子较长，结构较松散

export const elderlyPerson = {
  userId: 'elderly-person',
  name: '老年人',
  messages: [
    '唉，人老了，身体是一天不如一天了，这膝盖啊，老是疼',
    '想当年啊，我们年轻的时候，生活可没现在这么方便',
    '孩子们都很忙，平时也难得回来一趟，有时候真觉得挺孤单的',
    '今天天气不错，我出去晒晒太阳，活动活动筋骨',
    '记得我年轻的时候，那时候的人啊，都特别淳朴',
    '现在的年轻人啊，整天抱着个手机，连说话的功夫都没有',
    '我这把年纪了，就希望身体能健健康康的，不给孩子们添麻烦',
    '昨天晚上没睡好，总觉得心里不踏实，也不知道是怎么回事',
    '想当年我们结婚的时候，哪有现在这么多讲究',
    '现在的东西啊，是越来越先进了，可我这老脑筋啊，实在是跟不上了',
    '孩子们都很孝顺，经常来看我，给我买这买那的',
    '年纪大了，记性也不好了，刚说过的话转身就忘了',
    '今天早上起来，感觉精神还不错，就自己做了点早饭',
    '想当年在生产队干活的时候，那真是起早贪黑啊',
    '现在的生活条件比以前好多了，就是有时候觉得有点无聊'
  ],
  characteristics: {
    vocabulary: ['人老了', '想当年', '孩子们', '身体', '天气', '年轻人', '记性', '生活', '生产队', '无聊'],
    sentenceLength: { short: 2, medium: 8, long: 5 },
    punctuation: { comma: 15, period: 15, exclamation: 0, question: 2, colon: 0, semicolon: 0 },
    emojiUsage: []
  }
}

// 导出所有测试语料库
export const userTestCorpus = {
  middleSchoolStudent,
  middleAgedAdult,
  elderlyPerson
}

// 获取所有测试用户
export const getAllTestUsers = () => {
  return Object.values(userTestCorpus)
}

// 根据用户ID获取测试用户
export const getTestUserById = (userId) => {
  return Object.values(userTestCorpus).find(user => user.userId === userId)
}

// 生成混合测试数据（用于测试识别准确性）
export const generateMixedTestData = () => {
  const mixedMessages = []
  
  // 从每个用户那里随机选择一些消息
  Object.values(userTestCorpus).forEach(user => {
    const randomMessages = user.messages
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
    
    randomMessages.forEach(message => {
      mixedMessages.push({
        userId: user.userId,
        name: user.name,
        message: message
      })
    })
  })
  
  // 打乱顺序
  return mixedMessages.sort(() => 0.5 - Math.random())
}
