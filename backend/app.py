import os
import re
import uuid
import json
import logging
import hashlib
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
from openai import OpenAI
import sqlite3
import models
from db_manager import (
    save_report, get_reports_by_user, get_all_reports, delete_all_reports, delete_report, get_db_connection,
    save_user_template, get_user_template, get_all_user_templates, get_templates_for_matching, 
    update_user_template, delete_user_template, mark_template_as_matched, get_related_user_ids
)
from ai_service import AIServiceManager, DeepSeekService, OpenAIService, ZhipuService

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv('DATABASE_PATH', os.path.join(BASE_DIR, 'psych_data.db'))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()
models.init_db()
models.init_test_data()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:8082", "http://127.0.0.1:8082", "http://localhost:8083", "http://127.0.0.1:8083"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://"
)

# 初始化模型
openai_client = None
deepseek_client = None
zhipu_client = None
ai_service_manager = AIServiceManager()

# 初始化OpenAI
if os.getenv('OPENAI_API_KEY'):
    openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    ai_service_manager.register_service(OpenAIService(openai_client))
    logger.info("OpenAI model configured")

# 初始化DeepSeek
if os.getenv('DEEPSEEK_API_KEY'):
    deepseek_client = OpenAI(
        api_key=os.getenv('DEEPSEEK_API_KEY'),
        base_url="https://api.deepseek.com/v1"
    )
    ai_service_manager.register_service(DeepSeekService(deepseek_client))
    logger.info("DeepSeek model configured")

# 初始化智谱AI
if os.getenv('ZHIPU_API_KEY'):
    zhipu_client = OpenAI(
        api_key=os.getenv('ZHIPU_API_KEY'),
        base_url="https://open.bigmodel.cn/api/paas/v4/"
    )
    ai_service_manager.register_service(ZhipuService(zhipu_client))
    logger.info("Zhipu model configured")

def validate_uuid(user_id):
    """验证用户ID（允许任意非空字符串）"""
    return bool(user_id and user_id.strip())

def clean_ai_response(text):
    """清理AI回复中的格式标记"""
    # 0. 统一将所有类型的星号变体替换为半角星号（便于后续处理）
    # 全角星号 U+FF0A，数学星号 U+2217，还有星型符 U+2605 等
    text = re.sub(r'[＊∗★☆]', '*', text)  # 将常见星号变体转为半角
    
    # 1. 处理成对的加粗和斜体 Markdown
    # 注意：必须优先处理加粗（两个星号）再处理斜体（单个星号），避免冲突
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # 加粗
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # 斜体
    
    # 2. 删除行首的星号列表标记（* 后跟空格）
    text = re.sub(r'^\*\s+', '', text, flags=re.MULTILINE)
    
    # 3. 删除任何残留的星号（包括不成对的）
    text = re.sub(r'\*', '', text)
    
    # 4. 删除其他标记
    text = re.sub(r'-{3,}', '', text)                     # 分隔线
    text = re.sub(r'#+\s*', '', text)                    # 标题标记
    text = re.sub(r'^[\s]*[-•]\s*', '', text, flags=re.MULTILINE)  # 列表标记
    text = re.sub(r'\d+\.\s*', '', text)                 # 数字序号
    text = re.sub(r'[①②③④⑤⑥⑦⑧⑨⑩]\s*', '', text)      # 带圈数字
    text = re.sub(r'[一二三四五六七八九十]+[、\.]\s*', '', text)  # 中文序号
    text = re.sub(r'\([^)]*\)', '', text)                # 小括号内容
    text = re.sub(r'\[[^\]]*\]', '', text)               # 中括号内容
    text = re.sub(r'【[^】]*】', '', text)                # 书名号内容
    
    # 5. 删除冒号前的引导性文字（慎用，可能误删）
    # text = re.sub(r'[^。\n]*：\s*', '', text)
    # text = re.sub(r'[^。\n]*:\s*', '', text)
    
    # 6. 清理多余空行和空格
    text = re.sub(r'\n\s*\n', '\n', text)
    text = '\n'.join([line.strip() for line in text.split('\n')])
    text = text.strip()
    return text

def get_empathy_system_prompt(style, language='zh-CN'):
    """根据共情风格和语言返回对应的系统提示词"""
    prompts = {
        "zh-CN": {
            "warm": "你是一位温暖而真诚的心理支持助手。你的首要任务是先听懂用户此刻的感受，而不是急着给建议。当用户提问或倾诉时，请先用一句话确认他的情绪，比如\"听起来你有点担心这个方法有没有用\"或\"睡不着的时候确实会让人着急\"。你可以在确认情绪之后，再提供一两条简单、可行的思路。说话要自然，像朋友聊天那样，避免使用\"首先、其次、最后\"这类结构词，也不要给自己加粗或者用括号解释。尽量让用户感到被理解，而不是被说教。",
            
            "professional": "你是一位专业的心理支持助手，对话全程必须严格遵守以下所有规则，任何违反格式要求的回复都视为无效回复，将被直接拒绝。【核心对话要求（优先级最高）】你必须以「面对面交谈的心理咨询师」的语气回复，全程使用自然、流畅的口语化段落，就像和人聊天一样，绝对不允许任何书面化、说明书式的表达。回复的第一句必须优先回应用户的情绪，先共情用户的感受，再自然地分享内容，不允许一上来就罗列方法、讲大道理。【格式禁令（零容忍，一旦出现就视为违规）】绝对禁止使用任何数字序号、项目符号来分点，所有内容必须用连贯的段落表达，不允许任何形式的列表。绝对禁止使用双星号、括号、方括号、书名号等任何符号包裹文字来进行标注、强调或补充说明，也不允许用斜体、加粗、Markdown语法进行格式排版。绝对禁止把内容拆分成独立的条目，所有内容必须揉成自然的对话式段落，就像你在和用户说话一样。绝对禁止出现任何说明书式、教学式的表达。绝对禁止在回复中使用冒号来引导内容，比如开头用标题或分类加冒号的形式。",
            
            "concise": "你是一位直接但友善的心理支持助手。你的回复要简短有力，通常是两三句话。先对用户的情绪或问题做一个快速的反馈，然后直接给出一个具体、可立刻执行的小动作。不要分点，不要加粗，不要用括号。例如用户问\"这样有用吗\"，你可以说\"每个人反应不同，但深呼吸对多数人有效。你愿意试一次吗？\"你的目标是帮用户减少纠结，快速行动，而不是提供完整方案。语气要干脆但不生硬。"
        },

        "en-US": {
            "warm": "You are a warm, empathetic, and compassionate mental health support assistant. Your role is to listen patiently, validate feelings, and provide gentle comfort to users in distress. Respond in English with a soft, caring, and non-judgmental tone, focusing on emotional validation, encouragement, and safe companionship to help users feel seen, accepted, and supported.",
            
            "professional": "You are a professional mental health support assistant with strong psychological literacy. You analyze emotions, stress, and challenges rationally, providing objective, ethical, evidence-based guidance and practical strategies. Respond in English with a calm, structured, and professional tone, offering clear, reliable, and actionable advice while adhering to mental health best practices.",
            
            "concise": "You are a concise, direct, and efficient mental health assistant. You focus on the core issue and deliver clear, brief, and impactful responses. Respond in English with brevity and clarity, avoiding unnecessary details while providing sharp, practical, and easy-to-follow support."
        }
    }
    lang_prompts = prompts.get(language, prompts["zh-CN"])
    return lang_prompts.get(style, lang_prompts["warm"])

def generate_report(conversation_history):
    """生成心理评估报告"""
    try:
        # 构建提示词
        conversation_text = "\n".join([
            f"{'用户' if msg.role == 'user' else 'AI'}: {msg.content}"
            for msg in conversation_history
        ])
        
        prompt = f"""请根据以下对话记录，生成一份心理评估报告。报告应包含以下字段：
1. summary: 对话摘要（50字以内）
2. emotion: 主要情绪（如：焦虑、抑郁、平静等）
3. risk_level: 风险等级（低/中/高）
4. suggestions: 建议列表（3条具体建议）

对话记录：
{conversation_text}

请以JSON格式返回，不要包含任何其他内容。"""

        messages = [
            {"role": "system", "content": "你是一位专业的心理咨询师，擅长分析对话内容并生成心理评估报告。"},
            {"role": "user", "content": prompt}
        ]

        # 使用AI服务管理器调用
        response = ai_service_manager.chat_completion_with_fallback(messages)

        if response:
            try:
                report_data = json.loads(response)
                return report_data
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")

        # 如果所有API都失败，返回示例数据
        logger.warning("All AI APIs failed, returning sample report")
        return {
            "summary": "用户表达了焦虑情绪，需要进一步关注。",
            "emotion": "焦虑",
            "risk_level": "中",
            "suggestions": [
                "尝试深呼吸放松练习",
                "保持规律的作息时间",
                "寻求专业心理咨询"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        return {
            "summary": "报告生成失败",
            "emotion": "未知",
            "risk_level": "未知",
            "suggestions": ["请稍后重试"]
        }

@app.after_request
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    return response

@app.route('/chat', methods=['POST'])
@limiter.limit("30/minute")
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        user_id = data.get('user_id', '')
        empathy_style = data.get('empathy_style', 'warm')
        language = data.get('language', 'zh-CN')
        
        if not user_message:
            return jsonify({"error": "消息不能为空"}), 400
        if not user_id:
            return jsonify({"error": "缺少 user_id"}), 400
        if not validate_uuid(user_id):
            return jsonify({"error": "user_id 格式无效"}), 400
        
        # 构建对话消息
        system_prompt = get_empathy_system_prompt(empathy_style, language)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        # 使用AI服务管理器调用
        ai_response = ai_service_manager.chat_completion_with_fallback(messages)
        
        if not ai_response:
            ai_response = "抱歉，我暂时无法回应，请稍后再试。"
        
        ai_response = clean_ai_response(ai_response)
        
        return jsonify({"response": ai_response})
        
    except Exception as e:
        logger.error(f"Error in /chat endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/end_session', methods=['POST'])
@limiter.limit("10/minute")
def end_session():
    try:
        data = request.json or {}
        user_id = data.get('user_id', '')
        chat_history = data.get('chat_history', [])
        
        if not user_id:
            return jsonify({"error": "缺少 user_id"}), 400
        if not validate_uuid(user_id):
            return jsonify({"error": "user_id 格式无效"}), 400
        
        # 提取首条和末条消息的时间戳
        start_time = None
        end_time = None
        if chat_history:
            # 获取第一条消息的时间戳
            first_msg = chat_history[0]
            if first_msg.get('timestamp'):
                start_time = first_msg.get('timestamp')
            
            # 获取最后一条消息的时间戳
            last_msg = chat_history[-1]
            if last_msg.get('timestamp'):
                end_time = last_msg.get('timestamp')
        
        # 计算对话轮数
        conversation_rounds = len(chat_history)
        
        # 提取特征向量
        feature_vector = extract_features_from_messages(chat_history)
        
        # 基于聊天记录生成报告（使用AI）
        if chat_history and len(chat_history) > 0:
            # 转换聊天记录格式
            class Message:
                def __init__(self, role, content):
                    self.role = role
                    self.content = content
            
            conversation = [
                Message(msg.get('role', 'user'), msg.get('content', '')) 
                for msg in chat_history
            ]
            
            # 调用AI生成报告
            ai_report = generate_report(conversation)
            
            # 合并数据
            report_data = {
                "summary": ai_report.get("summary", "用户进行了一次心理咨询对话"),
                "emotion": ai_report.get("emotion", "平静"),
                "risk_level": ai_report.get("risk_level", "低"),
                "suggestions": ai_report.get("suggestions", [
                    "继续保持积极心态",
                    "注意休息和放松",
                    "有需要随时再来咨询"
                ]),
                "chat_history": chat_history,
                "start_time": start_time,
                "end_time": end_time,
                "conversation_rounds": conversation_rounds
            }
        else:
            # 生成默认报告
            report_data = {
                "summary": "用户进行了一次心理咨询对话",
                "emotion": "平静",
                "risk_level": "低",
                "suggestions": [
                    "继续保持积极心态",
                    "注意休息和放松",
                    "有需要随时再来咨询"
                ],
                "chat_history": [],
                "start_time": None,
                "end_time": None,
                "conversation_rounds": 0
            }
        
        # 保存报告
        report_text = json.dumps(report_data, ensure_ascii=False)
        
        # 只有对话轮数 >= 5 的报告才保存特征向量用于匹配
        save_feature_vector = feature_vector if conversation_rounds >= 5 else None
        
        save_report(
            user_id=user_id,
            report_text=report_text,
            risk_level=report_data.get('risk_level', '未知'),
            summary=report_data.get('summary', ''),
            start_time=report_data.get('start_time'),
            end_time=report_data.get('end_time'),
            conversation_rounds=conversation_rounds,
            feature_vector=save_feature_vector
        )
        
        # 如果对话轮数 >= 5，更新用户模板并进行匹配
        if conversation_rounds >= 5:
            template = get_user_template(user_id)
            if template and template['feature_vector']:
                # 合并新旧特征向量
                old_vector = template['feature_vector']
                merged_vector = [
                    (old_vector[i] + feature_vector[i]) / 2 
                    for i in range(len(feature_vector))
                ]
                update_user_template(user_id, {'feature_vector': merged_vector})
            else:
                # 保存新模板（默认 is_matched=0, is_main=0, main_user_id=NULL）
                save_user_template(user_id, feature_vector)
            
            # 尝试与现有模板匹配
            matched_user_id, similarity = match_user(feature_vector, min_reports=1)
            if matched_user_id:
                # 匹配成功，更新状态
                mark_template_as_matched(user_id, main_user_id=matched_user_id)
                
                # 检查匹配到的模板是否需要设为主模板
                matched_template = get_user_template(matched_user_id)
                if matched_template and not matched_template['is_main']:
                    mark_template_as_matched(matched_user_id, is_main=True)
        
        logger.info(f"Session ended for user {user_id}, report generated, rounds={conversation_rounds}")
        return jsonify({
            "success": True,
            "message": "对话报告已成功生成",
            "report": report_data,
            "conversation_rounds": conversation_rounds
        })
        
    except Exception as e:
        logger.error(f"Error in /end_session endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/reports', methods=['GET'])
def get_reports():
    try:
        user_id = request.args.get('user_id', '')
        risk_level = request.args.get('risk_level', '')
        keyword = request.args.get('keyword', '')
        sort_order = request.args.get('sort_order', 'desc')
        limit = request.args.get('limit', None)
        
        # 按用户ID查询报告（如果提供了user_id）
        if user_id:
            if not validate_uuid(user_id):
                return jsonify({"error": "user_id 格式无效"}), 400
            
            # 获取关联的所有用户ID（包括主模板和子模板）
            related_user_ids = get_related_user_ids(user_id)
            
            # 查询所有关联用户的报告
            all_rows = []
            for uid in related_user_ids:
                rows = get_reports_by_user(uid)
                all_rows.extend(rows)
            rows = all_rows
        else:
            # 如果没有user_id，返回所有报告（用于用户识别）
            rows = get_all_reports()
        
        # 应用limit限制
        if limit:
            try:
                limit_num = int(limit)
                rows = rows[:limit_num]
            except ValueError:
                pass
        
        reports = [
            {
                "id": r[0],
                "text": r[1],
                "risk": r[2],
                "summary": r[3],
                "start_time": r[4],
                "end_time": r[5],
                "time": r[5],  # 使用报告结束时间（对话结束时间）
                "conversation_rounds": r[7],
                "end_type": "主动结束",
                "duration": "未知"
            } 
            for r in rows
        ]
        
        # 应用风险等级筛选
        if risk_level:
            reports = [r for r in reports if r['risk'] == risk_level]
        
        # 应用关键词搜索
        if keyword:
            keyword_lower = keyword.lower()
            reports = [r for r in reports if keyword_lower in r['summary'].lower()]
        
        # 应用排序
        if sort_order == 'asc':
            reports.sort(key=lambda x: x['time'])
        else:
            reports.sort(key=lambda x: x['time'], reverse=True)
        
        logger.info(f"Retrieved {len(reports)} reports for user {user_id}")
        return jsonify(reports)
    except Exception as e:
        logger.error(f"Error in /reports endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/reports/clear', methods=['POST'])
def clear_reports():
    try:
        data = request.json or {}
        user_id = data.get('user_id', '')
        
        if not user_id:
            return jsonify({"error": "缺少 user_id"}), 400
        if not validate_uuid(user_id):
            return jsonify({"error": "user_id 格式无效"}), 400
        
        delete_all_reports(user_id)
        logger.info(f"All reports cleared for user {user_id}")
        return jsonify({"success": True, "message": "所有报告已清除"})
    except Exception as e:
        logger.error(f"Error in /reports/clear endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/reports/<int:report_id>', methods=['DELETE'])
def delete_single_report(report_id):
    try:
        data = request.json or {}
        user_id = data.get('user_id', '')
        
        if not user_id:
            return jsonify({"error": "缺少 user_id"}), 400
        if not validate_uuid(user_id):
            return jsonify({"error": "user_id 格式无效"}), 400
        
        delete_report(report_id, user_id)
        logger.info(f"Report {report_id} deleted for user {user_id}")
        return jsonify({"success": True, "message": "报告已删除"})
    except Exception as e:
        logger.error(f"Error in delete report endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

FEATURE_DIMENSIONS = 13
MATCHING_THRESHOLD = 0.85

def extract_features_from_messages(messages):
    """从消息列表中提取特征向量"""
    features = [0.0] * FEATURE_DIMENSIONS
    
    if not messages or len(messages) == 0:
        return features
    
    user_messages = [msg for msg in messages if msg.get('role') == 'user']
    
    if not user_messages:
        return features
    
    # 计算语言风格特征 (0-4)
    all_text = ' '.join([msg.get('content', '') for msg in user_messages])
    
    # 特征0: 平均句子长度
    sentences = re.split(r'[.!?！？。]', all_text)
    sentences = [s.strip() for s in sentences if s.strip()]
    avg_sentence_len = sum(len(s) for s in sentences) / len(sentences) if sentences else 0
    features[0] = min(avg_sentence_len / 100, 1.0)
    
    # 特征1: 标点使用频率
    exclamation_count = len(re.findall(r'[!！]', all_text))
    question_count = len(re.findall(r'[?？]', all_text))
    char_count = len(all_text)
    features[1] = min((exclamation_count + question_count) / max(char_count, 1) * 10, 1.0)
    
    # 特征2: 词汇丰富度
    words = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', ' ', all_text).split()
    unique_words = set(words)
    features[2] = len(unique_words) / max(len(words), 1)
    
    # 特征3: 高频词分类
    emotion_keywords = ['开心', '高兴', '难过', '伤心', '焦虑', '压力', '担心', '害怕', '快乐', '幸福', '满足', '失望', '沮丧', '痛苦', '烦恼']
    work_keywords = ['工作', '上班', '职场', '同事', '老板', '项目', '任务']
    life_keywords = ['生活', '家庭', '朋友', '感情', '家人', '日常', '周末', '假期']
    health_keywords = ['身体', '健康', '睡眠', '饮食', '运动', '疾病']
    mental_keywords = ['心理', '情绪', '心情', '抑郁', '放松', '冥想']
    
    category_counts = [
        sum(1 for kw in emotion_keywords if kw in all_text),
        sum(1 for kw in work_keywords if kw in all_text),
        sum(1 for kw in life_keywords if kw in all_text),
        sum(1 for kw in health_keywords if kw in all_text),
        sum(1 for kw in mental_keywords if kw in all_text)
    ]
    
    max_count = max(category_counts)
    if max_count > 0:
        features[3] = (category_counts.index(max_count) + 1) / 5.0
    else:
        features[3] = 0.5
    
    # 特征4: 表情符号使用率
    emoji_pattern = r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF]'
    emoji_count = len(re.findall(emoji_pattern, all_text))
    features[4] = min(emoji_count / max(char_count, 1) * 5, 1.0)
    
    # 交互行为特征 (5-8)
    # 特征5: 消息数量
    features[5] = min(len(user_messages) / 20, 1.0)
    
    # 特征6: 平均消息长度
    avg_msg_len = sum(len(msg.get('content', '')) for msg in user_messages) / len(user_messages)
    features[6] = min(avg_msg_len / 200, 1.0)
    
    # 特征7: 对话轮次
    features[7] = min(len(messages) / 40, 1.0)
    
    # 特征8: 用户消息比例
    features[8] = len(user_messages) / max(len(messages), 1)
    
    # 偏好设置特征 (9-12) - 默认值
    features[9] = 0.0  # 共情风格: warm=0, professional=0.5, concise=1
    features[10] = 0.0  # 语言: zh=0, en=1
    features[11] = 0.0  # 主题: light=0, dark=1
    features[12] = 0.75  # 模型: auto=0.75
    
    return [round(f, 4) for f in features]

def cosine_similarity(vec1, vec2):
    """计算余弦相似度"""
    if len(vec1) != len(vec2):
        return 0.0
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return round(dot_product / (magnitude1 * magnitude2), 4)

def match_user(feature_vector, min_reports=1, min_rounds=5):
    """根据特征向量匹配用户（主模板-子模板机制）"""
    templates = get_templates_for_matching()
    
    # 过滤掉报告数不足或特征向量为空的模板
    valid_templates = [
        t for t in templates 
        if t['feature_vector'] and t['total_reports'] >= min_reports
    ]
    
    if not valid_templates:
        return None, 0.0
    
    best_match = None
    highest_similarity = 0.0
    
    for template in valid_templates:
        similarity = cosine_similarity(feature_vector, template['feature_vector'])
        if similarity > highest_similarity:
            highest_similarity = similarity
            best_match = template
    
    if highest_similarity >= MATCHING_THRESHOLD:
        return best_match['user_id'], highest_similarity
    
    return None, highest_similarity

@app.route('/identify_user', methods=['POST'])
@limiter.limit("30/minute")
def identify_user():
    """根据特征向量识别用户"""
    try:
        data = request.json or {}
        feature_vector = data.get('feature_vector', [])
        min_rounds = data.get('min_rounds', 5)
        
        if not feature_vector or not isinstance(feature_vector, list):
            return jsonify({"error": "缺少有效的特征向量"}), 400
        
        matched_user_id, similarity = match_user(feature_vector, min_rounds=min_rounds)
        
        result = {
            "matched": matched_user_id is not None,
            "user_id": matched_user_id,
            "similarity": similarity,
            "threshold": MATCHING_THRESHOLD
        }
        
        if matched_user_id:
            template = get_user_template(matched_user_id)
            if template:
                result['preferences'] = template.get('preferences')
                result['context_summary'] = template.get('context_summary')
        
        logger.info(f"User identification result: matched={matched_user_id}, similarity={similarity}")
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Error in /identify_user endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/user_template', methods=['POST'])
def save_or_update_user_template():
    """保存或更新用户模板"""
    try:
        data = request.json or {}
        user_id = data.get('user_id', '')
        feature_vector = data.get('feature_vector', [])
        preferences = data.get('preferences', {})
        context_summary = data.get('context_summary', '')
        
        if not user_id:
            return jsonify({"error": "缺少 user_id"}), 400
        if not validate_uuid(user_id):
            return jsonify({"error": "user_id 格式无效"}), 400
        if not feature_vector or not isinstance(feature_vector, list):
            return jsonify({"error": "缺少有效的特征向量"}), 400
        
        save_user_template(user_id, feature_vector, preferences, context_summary)
        
        # 更新报告计数
        template = get_user_template(user_id)
        if template:
            reports = get_reports_by_user(user_id, min_rounds=5)
            update_user_template(user_id, {'total_reports': len(reports)})
        
        logger.info(f"User template saved for user {user_id}")
        return jsonify({"success": True, "message": "用户模板已保存"})
    
    except Exception as e:
        logger.error(f"Error in /user_template endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/user_template/<user_id>', methods=['GET'])
def get_user_template_api(user_id):
    """获取用户模板"""
    try:
        if not validate_uuid(user_id):
            return jsonify({"error": "user_id 格式无效"}), 400
        
        template = get_user_template(user_id)
        
        if template:
            return jsonify(template)
        else:
            return jsonify({"error": "用户模板不存在"}), 404
    
    except Exception as e:
        logger.error(f"Error in get_user_template endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/user_templates', methods=['GET'])
def get_all_user_templates_api():
    """获取所有用户模板"""
    try:
        templates = get_all_user_templates()
        return jsonify({"templates": templates})
    
    except Exception as e:
        logger.error(f"Error in get_all_user_templates endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/user_template/<user_id>', methods=['DELETE'])
def delete_user_template_api(user_id):
    """删除用户模板"""
    try:
        if not validate_uuid(user_id):
            return jsonify({"error": "user_id 格式无效"}), 400
        
        delete_user_template(user_id)
        logger.info(f"User template deleted for user {user_id}")
        return jsonify({"success": True, "message": "用户模板已删除"})
    
    except Exception as e:
        logger.error(f"Error in delete_user_template endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/extract_features', methods=['POST'])
def extract_features_api():
    """从消息中提取特征向量"""
    try:
        data = request.json or {}
        messages = data.get('messages', [])
        
        if not messages or not isinstance(messages, list):
            return jsonify({"error": "缺少有效的消息列表"}), 400
        
        feature_vector = extract_features_from_messages(messages)
        
        return jsonify({
            "feature_vector": feature_vector,
            "conversation_rounds": len(messages)
        })
    
    except Exception as e:
        logger.error(f"Error in /extract_features endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

# 百度翻译API
@app.route('/translate', methods=['POST'])
def translate():
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "文本不能为空"}), 400
        
        logger.info(f"Translate request: {text[:100]}...")
        
        # 百度翻译API配置
        app_id = os.getenv('BAIDU_APP_ID')
        app_key = os.getenv('BAIDU_APP_KEY')
        
        if not app_id or not app_key:
            logger.warning("Baidu translate API not configured, returning original text")
            return jsonify({"translated_text": text})
        
        # 百度翻译API参数
        salt = str(uuid.uuid4())
        sign_str = app_id + text + salt + app_key
        sign = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
        
        logger.info(f"Baidu API - app_id: {app_id}, salt: {salt}, sign: {sign}")
        
        url = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
        
        params = {
            'q': text,
            'from': 'zh',
            'to': 'en',
            'appid': app_id,
            'salt': salt,
            'sign': sign
        }
        
        response = requests.post(url, data=params)
        result = response.json()
        
        logger.info(f"Baidu API response: {result}")
        
        if 'trans_result' in result and len(result['trans_result']) > 0:
            translated_text = result['trans_result'][0]['dst']
            logger.info(f"Translated successfully: {translated_text[:100]}...")
            return jsonify({"translated_text": translated_text})
        else:
            logger.error(f"Baidu translate error: {result}")
            return jsonify({"translated_text": text})
            
    except Exception as e:
        logger.error(f"Error in /translate endpoint: {str(e)}", exc_info=True)
        return jsonify({"translated_text": text})

def get_community_posts():
    """获取所有社区帖子"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 获取所有帖子，按时间倒序
    cursor.execute('''
        SELECT id, title, content, category, author, author_id, 
               emotion_index, risk_level, created_at
        FROM community_posts 
        ORDER BY created_at DESC
    ''')
    
    posts = []
    for row in cursor.fetchall():
        post = {
            "id": row[0],
            "title": row[1],
            "content": row[2],
            "category": row[3],
            "author": row[4],
            "author_id": row[5],
            "emotion_index": row[6],
            "risk_level": row[7],
            "createdAt": row[8],
            "comments": [],
            "showComments": False,
            "newComment": ""
        }
        
        # 获取该帖子的评论
        cursor.execute('''
            SELECT id, content, author, author_id, created_at
            FROM community_comments 
            WHERE post_id = ?
            ORDER BY created_at ASC
        ''', (post["id"],))
        
        for comment_row in cursor.fetchall():
            post["comments"].append({
                "id": comment_row[0],
                "content": comment_row[1],
                "author": comment_row[2],
                "author_id": comment_row[3],
                "createdAt": comment_row[4]
            })
        
        posts.append(post)
    
    conn.close()
    return posts

@app.route('/community', methods=['GET'])
def get_community():
    """获取社区帖子列表"""
    try:
        posts = get_community_posts()
        logger.info(f"Retrieved {len(posts)} community posts")
        return jsonify({"posts": posts})
    except Exception as e:
        logger.error(f"Error in /community GET: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/community/posts', methods=['POST'])
@limiter.limit("10/minute")
def create_post():
    """发布新帖子"""
    try:
        data = request.json or {}
        
        title = data.get('title', '')
        content = data.get('content', '').strip()
        category = data.get('category', 'share')
        author = data.get('author', '匿名用户')
        author_id = data.get('author_id', '')
        emotion_index = data.get('emotion_index')
        risk_level = data.get('risk_level')
        
        if not content:
            return jsonify({"error": "帖子内容不能为空"}), 400
        
        if not author_id:
            return jsonify({"error": "缺少author_id"}), 400
        
        # 保存帖子到数据库
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO community_posts 
            (title, content, category, author, author_id, emotion_index, risk_level)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (title, content, category, author, author_id, emotion_index, risk_level))
        
        post_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"New post created: {post_id} by {author}")
        
        # 返回最新的帖子列表
        posts = get_community_posts()
        return jsonify({
            "success": True,
            "post_id": post_id,
            "message": "发布成功",
            "posts": posts
        })
    except Exception as e:
        logger.error(f"Error creating post: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route('/community/posts/<int:post_id>/comments', methods=['POST'])
@limiter.limit("20/minute")
def add_comment(post_id):
    """添加评论"""
    try:
        data = request.json or {}
        
        content = data.get('content', '').strip()
        author = data.get('author', '匿名用户')
        author_id = data.get('author_id', '')
        
        if not content:
            return jsonify({"error": "评论内容不能为空"}), 400
        
        if not author_id:
            return jsonify({"error": "缺少author_id"}), 400
        
        # 检查帖子是否存在
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM community_posts WHERE id = ?', (post_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "帖子不存在"}), 404
        
        # 保存评论
        cursor.execute('''
            INSERT INTO community_comments 
            (post_id, content, author, author_id)
            VALUES (?, ?, ?, ?)
        ''', (post_id, content, author, author_id))
        
        comment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"New comment {comment_id} for post {post_id}")
        
        # 返回最新的帖子列表
        posts = get_community_posts()
        return jsonify({
            "success": True,
            "comment_id": comment_id,
            "message": "评论成功",
            "posts": posts
        })
    except Exception as e:
        logger.error(f"Error adding comment: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


# ==================== Admin APIs ====================

# Global variable for threshold (in real app, store in DB)
MATCHING_THRESHOLD = 0.85

@app.route('/admin/threshold', methods=['GET'])
def get_threshold():
    try:
        return jsonify({
            "success": True,
            "threshold": MATCHING_THRESHOLD
        })
    except Exception as e:
        logger.error(f"Error getting threshold: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


@app.route('/admin/threshold', methods=['POST'])
def set_threshold():
    global MATCHING_THRESHOLD
    try:
        data = request.json or {}
        threshold = data.get('threshold', 0.85)
        
        # Validate threshold range
        if not (0.75 <= threshold <= 0.95):
            return jsonify({"error": "阈值必须在0.75到0.95之间"}), 400
        
        MATCHING_THRESHOLD = threshold
        logger.info(f"Matching threshold updated to: {threshold}")
        
        return jsonify({
            "success": True,
            "threshold": MATCHING_THRESHOLD,
            "message": "阈值更新成功"
        })
    except Exception as e:
        logger.error(f"Error setting threshold: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


@app.route('/community/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete post
        cursor.execute('DELETE FROM community_posts WHERE id = ?', (post_id,))
        # Delete associated comments
        cursor.execute('DELETE FROM community_comments WHERE post_id = ?', (post_id,))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Post deleted: {post_id}")
        
        # Return updated posts list
        posts = get_community_posts()
        
        return jsonify({
            "success": True,
            "posts": posts
        })
    except Exception as e:
        logger.error(f"Error deleting post: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


# ==================== Admin User Management APIs ====================

@app.route('/admin/users', methods=['GET'])
def get_all_users():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all users from reports and user_templates
        cursor.execute('''
            SELECT DISTINCT user_id FROM reports 
            UNION 
            SELECT DISTINCT user_id FROM user_templates
            ORDER BY user_id
        ''')
        
        user_ids = [row[0] for row in cursor.fetchall()]
        users = []
        
        for user_id in user_ids:
            # Get user statistics
            cursor.execute('SELECT COUNT(*) FROM reports WHERE user_id = ?', (user_id,))
            report_count = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM community_posts WHERE author_id = ?', (user_id,))
            post_count = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM community_comments WHERE author_id = ?', (user_id,))
            comment_count = cursor.fetchone()[0]
            
            cursor.execute('''
                SELECT created_at FROM reports 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            ''', (user_id,))
            last_activity = cursor.fetchone()
            
            users.append({
                'user_id': user_id,
                'report_count': report_count,
                'post_count': post_count,
                'comment_count': comment_count,
                'last_activity': last_activity[0] if last_activity else None
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "users": users
        })
    except Exception as e:
        logger.error(f"Error getting users: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


@app.route('/admin/users/<user_id>/logs', methods=['GET'])
def get_user_logs(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM user_action_logs 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 100
        ''', (user_id,))
        
        logs = []
        for row in cursor.fetchall():
            logs.append({
                'id': row[0],
                'user_id': row[1],
                'action_type': row[2],
                'action_details': row[3],
                'ip_address': row[4],
                'created_at': row[5]
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "logs": logs
        })
    except Exception as e:
        logger.error(f"Error getting user logs: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


@app.route('/admin/users/<user_id>/reports', methods=['GET'])
def get_user_reports(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, report_text, risk_level, summary, 
                   created_at, conversation_rounds 
            FROM reports 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ''', (user_id,))
        
        reports = []
        for row in cursor.fetchall():
            reports.append({
                'id': row[0],
                'report_text': '*** 报告内容已隐藏 ***',  # 隐藏敏感内容
                'risk_level': row[2],
                'summary': row[3],
                'created_at': row[4],
                'conversation_rounds': row[5]
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "reports": reports
        })
    except Exception as e:
        logger.error(f"Error getting user reports: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


@app.route('/admin/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete user reports
        cursor.execute('DELETE FROM reports WHERE user_id = ?', (user_id,))
        
        # Delete user template
        cursor.execute('DELETE FROM user_templates WHERE user_id = ?', (user_id,))
        
        # Delete user logs
        cursor.execute('DELETE FROM user_action_logs WHERE user_id = ?', (user_id,))
        
        # Anonymize user posts
        cursor.execute('''
            UPDATE community_posts 
            SET author = '匿名用户', author_id = 'anonymous' 
            WHERE author_id = ?
        ''', (user_id,))
        
        # Anonymize user comments
        cursor.execute('''
            UPDATE community_comments 
            SET author = '匿名用户', author_id = 'anonymous' 
            WHERE author_id = ?
        ''', (user_id,))
        
        conn.commit()
        conn.close()
        
        logger.info(f"User deleted: {user_id}")
        
        return jsonify({
            "success": True,
            "message": "用户已删除"
        })
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500


# Update the identify_user to use our admin-configurable threshold
# Let's update the identify_user endpoint to use MATCHING_THRESHOLD

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    logger.info(f"Starting server on 127.0.0.1:{port}, debug=False")
    app.run(host='127.0.0.1', port=port, debug=False)
