import sqlite3
import json
import os

DB_PATH = 'psych_data.db'

def standardize_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM reports')
    rows = cursor.fetchall()
    
    print(f'找到 {len(rows)} 条报告记录')
    
    fixed_count = 0
    
    for row in rows:
        report_id = row[0]
        user_id = row[1]
        report_text = row[2]
        risk_level = row[3]
        summary = row[4]
        created_at = row[5]
        
        print(f'\n处理报告 ID: {report_id}')
        print(f'  原始数据:')
        print(f'    user_id: {user_id}')
        print(f'    report_text: {report_text[:100] if report_text else "None"}')
        print(f'    risk_level: {risk_level}')
        print(f'    summary: {summary}')
        print(f'    created_at: {created_at}')
        
        # 尝试解析数据
        parsed_data = None
        final_report_text = None
        final_risk_level = None
        final_summary = None
        final_created_at = None
        
        # 尝试不同的解析方式
        candidates = [report_text, risk_level, summary]
        for candidate in candidates:
            if candidate:
                try:
                    # 尝试清理并解析JSON
                    cleaned = candidate.strip()
                    if cleaned.startswith('```json'):
                        cleaned = cleaned[7:]
                    if cleaned.startswith('```'):
                        cleaned = cleaned[3:]
                    if cleaned.endswith('```'):
                        cleaned = cleaned[:-3]
                    cleaned = cleaned.strip()
                    
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict) and 'summary' in parsed:
                        parsed_data = parsed
                        print(f'  ✓ 成功解析JSON数据')
                        break
                except Exception as e:
                    continue
        
        if parsed_data:
            final_risk_level = parsed_data.get('risk_level', '未知')
            final_summary = parsed_data.get('summary', '无')
            final_report_text = json.dumps(parsed_data, ensure_ascii=False)
            
            # 验证风险等级
            if final_risk_level not in ['低', '中', '高', '未知']:
                final_risk_level = '未知'
            
            # 如果创建时间有问题，尝试从其他字段获取或使用默认值
            if not created_at or created_at == '无' or len(created_at) < 10:
                # 尝试检查其他字段
                for field in [report_text, risk_level, summary]:
                    if field and len(field) > 10 and ('-' in field or ':' in field):
                        final_created_at = field
                        break
                if not final_created_at:
                    final_created_at = '2026-03-28 00:00:00'
            else:
                final_created_at = created_at
            
            print(f'  标准化后:')
            print(f'    report_text: {final_report_text[:100]}')
            print(f'    risk_level: {final_risk_level}')
            print(f'    summary: {final_summary}')
            print(f'    created_at: {final_created_at}')
            
            # 更新数据库
            cursor.execute('''
                UPDATE reports 
                SET report_text = ?, risk_level = ?, summary = ?, created_at = ?
                WHERE id = ?
            ''', (final_report_text, final_risk_level, final_summary, final_created_at, report_id))
            
            fixed_count += 1
            print(f'  ✓ 报告 {report_id} 已更新')
    
    conn.commit()
    conn.close()
    
    print(f'\n\n数据标准化完成！共处理 {len(rows)} 条报告，修复了 {fixed_count} 条。')
    
    # 重新查询验证
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM reports ORDER BY id')
    rows = cursor.fetchall()
    
    print('\n验证标准化后的数据:')
    for row in rows:
        print(f'ID: {row[0]}, 用户ID: {row[1]}, 风险: {row[3]}, 时间: {row[5]}')
    
    conn.close()

if __name__ == '__main__':
    standardize_data()
