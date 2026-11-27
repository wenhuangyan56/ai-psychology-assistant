import sqlite3

DB_PATH = 'psych_data.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 检查表结构
print("表结构:")
cursor.execute("PRAGMA table_info(reports)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col[1]}: {col[2]}")

# 查询第一条数据
print("\n第一条数据:")
cursor.execute("SELECT * FROM reports LIMIT 1")
row = cursor.fetchone()
if row:
    print(row)

conn.close()
