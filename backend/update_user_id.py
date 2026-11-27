import sqlite3

DB_PATH = 'psych_data.db'
OLD_USER_ID = '8fc66647-c5d9-4c96-a9bc-f27ddffb639b'
NEW_USER_ID = 'd1c25250-d7eb-4d11-b82b-95b4badb4750'

def update_user_id():
    print("=" * 60)
    print("更新用户ID")
    print("=" * 60)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 查看当前用户的报告数量
    cursor.execute('SELECT COUNT(*) FROM reports WHERE user_id = ?', (OLD_USER_ID,))
    old_count = cursor.fetchone()[0]
    print(f"\n旧用户ID ({OLD_USER_ID[:8]}...) 的报告数: {old_count}")
    
    cursor.execute('SELECT COUNT(*) FROM reports WHERE user_id = ?', (NEW_USER_ID,))
    new_count = cursor.fetchone()[0]
    print(f"新用户ID ({NEW_USER_ID[:8]}...) 的报告数: {new_count}")
    
    # 更新用户ID
    if old_count > 0:
        print(f"\n正在将 {old_count} 条报告从旧用户ID更新到新用户ID...")
        cursor.execute('''
            UPDATE reports 
            SET user_id = ? 
            WHERE user_id = ?
        ''', (NEW_USER_ID, OLD_USER_ID))
        conn.commit()
        updated_count = cursor.rowcount
        print(f"✅ 成功更新 {updated_count} 条报告")
    else:
        print("\n没有需要更新的报告")
    
    # 验证结果
    print("\n" + "=" * 60)
    print("验证结果")
    print("=" * 60)
    
    cursor.execute('SELECT COUNT(*) FROM reports WHERE user_id = ?', (NEW_USER_ID,))
    final_count = cursor.fetchone()[0]
    print(f"\n新用户ID现在有 {final_count} 条报告")
    
    # 显示风险等级分布
    cursor.execute('''
        SELECT risk_level, COUNT(*) 
        FROM reports 
        WHERE user_id = ? 
        GROUP BY risk_level
    ''', (NEW_USER_ID,))
    
    risk_distribution = cursor.fetchall()
    print("\n风险等级分布:")
    for risk, count in risk_distribution:
        print(f"  {risk}: {count} 条")
    
    conn.close()
    print("\n" + "=" * 60)
    print("✅ 用户ID更新完成！")
    print("=" * 60)

if __name__ == "__main__":
    update_user_id()
