import sqlite3
import json
from datetime import datetime, timedelta
import random

DB_PATH = 'psych_data.db'

# 当前用户的ID（用户提供的正确ID）
CURRENT_USER_ID = '8fc66647-c5d9-4c96-a9bc-f27ddffb639b'

# 测试数据模板
low_risk_reports = [
    {
        "summary": "用户今天心情不错，主要讨论了工作上的一些小问题，情绪稳定。",
        "emotion": "平静、积极",
        "risk_level": "低",
        "suggestions": [
            "继续保持良好的情绪状态，适当进行放松活动",
            "记录每天的积极事件，培养感恩心态",
            "与朋友或家人分享快乐时刻，增强社交连接"
        ]
    },
    {
        "summary": "用户分享了最近的生活趣事，整体情绪良好，对未来充满期待。",
        "emotion": "愉快、乐观",
        "risk_level": "低",
        "suggestions": [
            "继续保持积极的生活态度",
            "将快乐时刻记录下来，建立正面情绪库",
            "尝试新的兴趣爱好，丰富生活内容"
        ]
    },
    {
        "summary": "用户表达了对自己进步的认可，情绪稳定，自我接纳度提高。",
        "emotion": "自信、满足",
        "risk_level": "低",
        "suggestions": [
            "继续肯定自己的努力和进步",
            "设定小目标并庆祝达成",
            "分享成长经历，激励他人也激励自己"
        ]
    }
]

medium_risk_reports = [
    {
        "summary": "用户提到了一些压力和焦虑，需要更多的支持和建议。",
        "emotion": "焦虑、疲惫",
        "risk_level": "中",
        "suggestions": [
            "尝试深呼吸练习，每天5-10分钟",
            "建立规律的作息时间，保证充足睡眠",
            "与信任的朋友倾诉，寻求情感支持"
        ]
    },
    {
        "summary": "用户因工作压力大而感到烦躁，情绪波动明显，需要调节。",
        "emotion": "烦躁、压力",
        "risk_level": "中",
        "suggestions": [
            "学习压力管理技巧，如时间管理",
            "适当运动，释放压力荷尔蒙",
            "考虑与上级沟通，调整工作负荷"
        ]
    },
    {
        "summary": "用户感到孤独和不被理解，情绪较为低落，需要关注和陪伴。",
        "emotion": "孤独、失落",
        "risk_level": "中",
        "suggestions": [
            "主动与亲友联系，建立社交连接",
            "参加兴趣小组或社区活动",
            "考虑寻求专业心理咨询支持"
        ]
    }
]

high_risk_reports = [
    {
        "summary": "用户情绪低落，表达了强烈的无助感，需要紧急关注和干预。",
        "emotion": "绝望、无助",
        "risk_level": "高",
        "suggestions": [
            "立即联系心理危机干预热线：400-161-9995",
            "告知信任的亲友，寻求陪伴和支持",
            "考虑前往医院心理科或精神科就诊"
        ]
    },
    {
        "summary": "用户表达了自杀念头，情绪极度不稳定，需要紧急干预。",
        "emotion": "绝望、痛苦",
        "risk_level": "高",
        "suggestions": [
            "立即拨打心理危机干预热线：400-995-9950",
            "不要独处，寻求家人或朋友陪伴",
            "尽快前往最近的医院急诊科"
        ]
    },
    {
        "summary": "用户感到生活没有意义，对未来失去希望，需要专业帮助。",
        "emotion": "绝望、空虚",
        "risk_level": "高",
        "suggestions": [
            "联系生命热线：400-161-9995",
            "与信任的人分享感受，不要独自承受",
            "预约专业心理咨询师或精神科医生"
        ]
    }
]

def generate_test_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 先删除当前用户的旧数据
    cursor.execute('DELETE FROM reports WHERE user_id = ?', (CURRENT_USER_ID,))
    print(f'已清除用户 {CURRENT_USER_ID[:8]}... 的旧数据')
    
    # 合并所有报告
    all_reports = low_risk_reports + medium_risk_reports + high_risk_reports
    
    # 生成不同时间（过去9天，每天一条）
    base_time = datetime.now()
    
    for i, report_data in enumerate(all_reports):
        # 计算时间（倒序，最新的在前）
        report_time = base_time - timedelta(days=i, hours=random.randint(0, 5))
        time_str = report_time.strftime('%Y-%m-%d %H:%M:%S')
        
        # 转换为JSON字符串
        report_text = json.dumps(report_data, ensure_ascii=False)
        risk_level = report_data['risk_level']
        summary = report_data['summary']
        
        # 插入数据库
        cursor.execute('''
            INSERT INTO reports (user_id, report_text, risk_level, summary, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (CURRENT_USER_ID, report_text, risk_level, summary, time_str))
        
        print(f'✓ 已添加报告 {i+1}/9 - 风险等级: {risk_level} - 时间: {time_str}')
    
    conn.commit()
    conn.close()
    
    print(f'\n✅ 成功生成9条测试数据！')
    print(f'   - 低风险: 3条')
    print(f'   - 中风险: 3条')
    print(f'   - 高风险: 3条')
    print(f'\n所有数据已关联到用户: {CURRENT_USER_ID}')

if __name__ == '__main__':
    generate_test_data()
