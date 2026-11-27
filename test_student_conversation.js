const axios = require('axios');

const STUDENT_MESSAGES = [
  "今天老师批评我了，我心里好难受呀",
  "我觉得自己什么都做不好，同学也不喜欢我",
  "上学好累啊，每天都有写不完的作业",
  "我不敢和爸爸妈妈说这些，怕他们担心我",
  "其实我也很想努力，但是就是提不起精神"
];

const EMPATHY_STYLE = 'warm';
const LANGUAGE = 'zh-CN';

async function sendMessage(message) {
  try {
    const response = await axios.post('http://127.0.0.1:8000/chat', {
      user_id: 'test-student-user',
      message: message,
      empathy_style: EMPATHY_STYLE,
      language: LANGUAGE
    });
    return response.data.response;
  } catch (error) {
    console.error('发送消息失败:', error.message);
    return null;
  }
}

async function runConversation() {
  console.log('=== 小学生对话模拟开始 ===\n');

  for (let i = 0; i < 5; i++) {
    console.log(`--- 第 ${i + 1} 轮对话 ---`);

    const userMessage = STUDENT_MESSAGES[i];
    console.log(`【小学生】: ${userMessage}`);

    const assistantResponse = await sendMessage(userMessage);

    if (assistantResponse) {
      console.log(`【心理助手】: ${assistantResponse}`);
    } else {
      console.log(`【心理助手】: [响应失败]`);
    }
    console.log('');

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('=== 对话模拟完成 ===');
}

runConversation().catch(console.error);
