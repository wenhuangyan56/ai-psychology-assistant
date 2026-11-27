# 心理支持助手

基于大语言模型的交互式心理辅助系统，具备实时风险识别、共情对话生成、会话报告自动生成与历史管理能力。

## 项目结构

```
xinlizhichi/
├── backend/                 # 后端代码
│   ├── app.py              # Flask 主应用
│   ├── ai_service.py       # AI 服务管理
│   ├── models.py           # 数据库模型
│   ├── db_manager.py       # 数据库操作
│   ├── requirements.txt    # Python 依赖
│   └── .env                # API 密钥配置（请勿上传！）
├── frontend/                # 前端 Vue 项目
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   ├── utils/          # 工具函数
│   │   ├── i18n.js         # 国际化
│   │   ├── App.vue         # 根组件
│   │   └── main.js         # 入口文件
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## 快速启动

### 1. 后端启动

```bash
cd backend
pip install -r requirements.txt
python app.py
```

默认端口：**8000**

### 2. 前端启动

```bash
cd frontend
npm install
npm run dev
```

默认端口：**8080**

访问 http://localhost:8080 即可使用。

## 功能特性

- 多轮对话（支持 DeepSeek、通义千问、智谱 AI）
- 自动风险识别（低/中/高）并高亮显示
- 会话结束自动生成结构化报告
- 历史报告管理（查看、删除）
- 社区论坛（发布、评论）
- 用户行为识别与个性化
- 深色/浅色主题切换
- 中英双语国际化
- 后台管理面板

## 配置说明

在 `backend/.env` 中配置 API 密钥（复制 `.env.example` 然后填入自己的密钥）：

```
DEEPSEEK_API_KEY=your_deepseek_key
ZHIPU_API_KEY=your_zhipu_key
BAIDU_APP_ID=your_baidu_translate_appid
BAIDU_APP_KEY=your_baidu_translate_key
```

## 技术栈

- **后端**: Python 3.11 + Flask + SQLite
- **前端**: Vue 3 + Vite + vue-i18n + Chart.js

## License

MIT License
