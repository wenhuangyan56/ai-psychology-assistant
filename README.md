# 心理支持助手

基于大语言模型的交互式心理辅助系统，具备实时风险识别、共情对话生成、会话报告自动生成与历史管理能力。

## 项目结构

```
xinlizhichi/
├── backend/                 # 后端代码
│   ├── app.py              # Flask 主应用
│   ├── models.py           # 数据库模型
│   ├── db_manager.py       # 数据库操作
│   ├── requirements.txt    # Python 依赖
│   └── .env                # API 密钥配置
├── frontend/                # 前端 Vue 项目
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   ├── views/          # 页面视图
│   │   ├── utils/          # 工具函数
│   │   ├── assets/styles/  # 样式文件
│   │   ├── App.vue         # 根组件
│   │   ├── main.js         # 入口文件
│   │   └── store.js        # 状态管理
│   ├── public/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 快速启动

### 1. 后端启动

```bash
cd backend
# 安装依赖
pip install -r requirements.txt
# 启动 Flask 服务（默认端口 8000）
python -m backend.app
```

### 2. 前端启动

```bash
cd frontend
# 安装依赖
npm install
# 启动 Vite 开发服务器
npm run dev
```

访问 http://localhost:5173 即可使用。

## 功能特性

- 多轮对话（支持 DeepSeek、通义千问、智谱 AI）
- 自动风险识别（低/中/高）并高亮显示
- 会话结束自动生成结构化报告
- 历史报告管理（查看、复制、导出、删除）
- 隐私保护（无需登录、会话隔离）
- 响应式设计（适配手机/平板）
- 基于用户消息风格的身份识别

## 配置说明

在 `backend/.env` 中配置 API 密钥：

```
DEEPSEEK_API_KEY=your_deepseek_key
QWEN_API_KEY=your_qwen_key
ZHIPU_API_KEY=your_zhipu_key
```
