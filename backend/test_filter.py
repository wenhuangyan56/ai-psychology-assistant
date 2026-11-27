import sqlite3
import json

DB_PATH = 'psych_data.db'

def test_filter():
    print("=" * 50)
    print("测试筛选功能")
    print("=" * 50)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 获取当前用户的所有报告
    user_id = '8fc66647-c5d9-4c96-a9bc-f27ddffb639b'
    
    print(f"\n当前用户ID: {user_id}")
    
    cursor.execute('''
        SELECT id, text, risk, summary, time FROM reports WHERE user_id = ? ORDER BY time DESC
    ''', (user_id,))
    
    rows = cursor.fetchall()
    print(f"\n总报告数: {len(rows)}")
    
    reports = [
        {
            "id": r[0],
            "text": r[1],
            "risk": r[2],
            "summary": r[3],
            "time": r[4]
        } 
        for r in rows
    ]
    
    print("\n所有报告的风险等级:")
    for i, report in enumerate(reports):
        print(f"  ID {report['id']}: {report['risk']} - {report['time']}")
    
    # 测试低风险筛选
    print("\n" + "=" * 50)
    print("测试1: 筛选低风险报告")
    print("=" * 50)
    low_risk = [r for r in reports if r['risk'] == '低']
    print(f"找到 {len(low_risk)} 条低风险报告:")
    for r in low_risk:
        print(f"  ID {r['id']}: {r['risk']}")
    
    # 测试中风险筛选
    print("\n" + "=" * 50)
    print("测试2: 筛选中风险报告")
    print("=" * 50)
    medium_risk = [r for r in reports if r['risk'] == '中']
    print(f"找到 {len(medium_risk)} 条中风险报告:")
    for r in medium_risk:
        print(f"  ID {r['id']}: {r['risk']}")
    
    # 测试高风险筛选
    print("\n" + "=" * 50)
    print("测试3: 筛选高风险报告")
    print("=" * 50)
    high_risk = [r for r in reports if r['risk'] == '高']
    print(f"找到 {len(high_risk)} 条高风险报告:")
    for r in high_risk:
        print(f"  ID {r['id']}: {r['risk']}")
    
    # 测试关键词搜索
    print("\n" + "=" * 50)
    print("测试4: 关键词搜索（'心情'）")
    print("=" * 50)
    keyword = '心情'
    keyword_lower = keyword.lower()
    keyword_results = [r for r in reports if keyword_lower in r['summary'].lower()]
    print(f"找到 {len(keyword_results)} 条包含'{keyword}'的报告:")
    for r in keyword_results:
        print(f"  ID {r['id']}: {r['summary'][:50]}...")
    
    print("\n" + "=" * 50)
    print("筛选功能测试完成！")
    print("=" * 50)
    
    conn.close()

if __name__ == "__main__":
    test_filter()
