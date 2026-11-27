import sqlite3
import json
from datetime import datetime, timedelta
import random

DB_PATH = 'psych_data.db'
CURRENT_USER_ID = '8fc66647-c5d9-4c96-a9bc-f27ddffb639b'

def check_and_regenerate():
    print("=" * 60)
    print("检查并重新生成测试数据")
    print("=" * 60)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 删除当前用户的所有报告
    print(f"\n删除当前用户（{CURRENT_USER_ID}）的所有报告...")
    cursor.execute('DELETE FROM reports WHERE user_id = ?', (CURRENT_USER_ID,))
    deleted_count = cursor.rowcount
    print(f"已删除 {deleted_count} 条报告")
    
    # 测试数据模板
    low_risk_reports = [
        {
            "summary": "用户今天心情不错，主要讨论了工作上的一些小问题，情绪稳定。",
            "emotion": "平静、积极",
            "risk_level": "低",
            "suggestions": [
                "继续保持当前的积极心态",
                "适当安排一些放松活动",
                "与朋友分享今天的好心情"
            ]
        },
        {
            "summary": "用户分享了一次愉快的周末经历，感到放松和满足。",
            "emotion": "开心、满足",
            "risk_level": "低",
            "suggestions": [
                "记录下这些美好的时刻",
                "计划下一次的放松活动",
                "保持工作与生活的平衡"
            ]
        },
        {
            "summary": "用户表达了对生活的感恩，虽然有小挫折但整体心态良好。",
            "emotion": "感恩、乐观",
            "risk_level": "低",
            "suggestions": [
                "继续坚持感恩的心态",
                "每天写下三件值得感恩的事",
                "将正能量传递给他人"
            ]
        }
    ]
    
    medium_risk_reports = [
        {
            "summary": "用户因情绪压抑、失眠及自我怀疑寻求倾听，担心成为他人负担，陷入焦虑循环。",
            "emotion": "孤独、焦虑、自我批判",
            "risk_level": "中",
            "suggestions": [
                "练习情绪安全表达，如每日用5分钟写下真实感受后撕掉，避免压抑积累",
                "建立睡前放松仪式，如温水泡手配合深呼吸，帮助身心过渡到休息状态",
                "重新定义‘尽力’，认可日常微小努力，减少自我苛责"
            ]
        },
        {
            "summary": "用户提到了一些压力和焦虑，需要更多的支持和建议。",
            "emotion": "压力、焦虑",
            "risk_level": "中",
            "suggestions": [
                "尝试深呼吸和冥想练习",
                "制定合理的时间管理计划",
                "寻求专业心理咨询师的帮助"
            ]
        },
        {
            "summary": "用户在人际关系上遇到了一些困扰，感到迷茫和无助。",
            "emotion": "迷茫、无助",
            "risk_level": "中",
            "suggestions": [
                "与信任的朋友坦诚交流",
                "学习有效的沟通技巧",
                "给自己一些时间和空间思考"
            ]
        }
    ]
    
    high_risk_reports = [
        {
            "summary": "用户情绪低落，有自杀倾向，需要紧急干预。",
            "emotion": "绝望、无助",
            "risk_level": "高",
            "suggestions": [
                "立即拨打心理危机干预热线",
                "24小时有人陪伴，不要独处",
                "尽快就医寻求专业帮助"
            ]
        },
        {
            "summary": "用户经历了严重的创伤事件，出现严重的情绪反应。",
            "emotion": "恐惧、痛苦",
            "risk_level": "高",
            "suggestions": [
                "寻求专业心理创伤治疗",
                "确保安全的生活环境",
                "逐步建立安全感和信任感"
            ]
        },
        {
            "summary": "用户有严重的抑郁症状，影响日常生活和工作。",
            "emotion": "抑郁、无力",
            "risk_level": "高",
            "suggestions": [
                "立即就医，遵医嘱服药",
                "配合心理治疗",
                "家人朋友给予支持和陪伴"
            ]
        }
    ]
    
    # 生成时间（最近9天）
    base_time = datetime.now()
    all_reports = []
    
    # 添加低风险报告
    for i, report_data in enumerate(low_risk_reports):
        report_time = base_time - timedelta(days=6 + i)
        all_reports.append((report_data, report_time))
    
    # 添加中风险报告
    for i, report_data in enumerate(medium_risk_reports):
        report_time = base_time - timedelta(days=3 + i)
        all_reports.append((report_data, report_time))
    
    # 添加高风险报告
    for i, report_data in enumerate(high_risk_reports):
        report_time = base_time - timedelta(days=i)
        all_reports.append((report_data, report_time))
    
    # 插入报告
    print("\n插入9条测试数据（低中高各3条）...")
    inserted_count = 0
    
    for report_data, report_time in all_reports:
        report_text = json.dumps(report_data, ensure_ascii=False)
        cursor.execute('''
            INSERT INTO reports (user_id, report_text, risk_level, summary, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            CURRENT_USER_ID,
            report_text,
            report_data['risk_level'],
            report_data['summary'],
            report_time.strftime('%Y-%m-%d %H:%M:%S')
        ))
        inserted_count += 1
        print(f"  插入: {report_data['risk_level']} - {report_time.strftime('%Y-%m-%d')}")
    
    conn.commit()
    
    # 验证插入结果
    print("\n" + "=" * 60)
    print("验证数据")
    print("=" * 60)
    
    cursor.execute('''
        SELECT id, risk_level, summary, created_at 
        FROM reports 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ''', (CURRENT_USER_ID,))
    
    rows = cursor.fetchall()
    
    print(f"\n当前用户共有 {len(rows)} 条报告:")
    print("\nID  风险等级  时间                摘要")
    print("-" * 80)
    
    risk_count = {'低': 0, '中': 0, '高': 0}
    for row in rows:
        risk_count[row[1]] += 1
        summary_short = row[2][:30] + "..." if len(row[2]) > 30 else row[2]
        print(f"{row[0]:<4} {row[1]:<8} {row[3][:16]}  {summary_short}")
    
    print("\n" + "=" * 60)
    print("统计:")
    print(f"  低风险: {risk_count['低']} 条")
    print(f"  中风险: {risk_count['中']} 条")
    print(f"  高风险: {risk_count['高']} 条")
    print(f"  总计: {len(rows)} 条")
    print("=" * 60)
    
    conn.close()
    print("\n✅ 测试数据生成完成！")

if __name__ == "__main__":
    check_and_regenerate()
