import sqlite3
from db_manager import get_db_connection

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 创建报告表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            report_text TEXT,
            risk_level TEXT,
            summary TEXT,
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            conversation_rounds INTEGER DEFAULT 0,
            feature_vector TEXT
        )
    ''')
    
    # 创建用户特征模板表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE,
            feature_vector TEXT,
            preferences TEXT,
            context_summary TEXT,
            total_reports INTEGER DEFAULT 0,
            last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_matched INTEGER DEFAULT 0,
            is_main INTEGER DEFAULT 0,
            main_user_id TEXT
        )
    ''')
    
    # 创建社区帖子表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            author TEXT NOT NULL,
            author_id TEXT NOT NULL,
            emotion_index REAL,
            risk_level TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 创建社区评论表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS community_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            author TEXT NOT NULL,
            author_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES community_posts (id)
        )
    ''')
    
    # 创建用户操作日志表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_action_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            action_details TEXT,
            ip_address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()


def init_test_data():
    """初始化测试数据"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 检查是否已有测试数据
    cursor.execute('SELECT COUNT(*) FROM reports')
    report_count = cursor.fetchone()[0]
    
    if report_count > 0:
        print("已有测试数据，跳过初始化")
        conn.close()
        return
    
    print("正在初始化测试数据...")
    
    # 创建测试用户1
    user1_id = "test_user_001"
    
    # 为用户1添加报告
    for i in range(5):
        cursor.execute('''
            INSERT INTO reports (user_id, report_text, risk_level, summary, conversation_rounds)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            user1_id,
            f"测试报告内容{i+1} - 用户1报告",
            ["低", "中", "高"][i % 3],
            f"这是用户1的第{i+1}份心理健康评估报告摘要",
            i + 3
        ))
    
    # 为用户1添加帖子
    cursor.execute('''
        INSERT INTO community_posts (title, content, category, author, author_id, risk_level)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ("分享我的心情", "今天感觉好多了，感谢大家的支持！", "share", "张小明", user1_id, "低"))
    
    # 为用户1添加操作日志
    for i in range(4):
        cursor.execute('''
            INSERT INTO user_action_logs (user_id, action_type, action_details)
            VALUES (?, ?, ?)
        ''', (user1_id, ["登录", "查看报告", "发帖", "聊天"][i % 4], f"用户操作{i+1}详情"))
    
    # 创建测试用户2
    user2_id = "test_user_002"
    
    # 为用户2添加报告
    for i in range(3):
        cursor.execute('''
            INSERT INTO reports (user_id, report_text, risk_level, summary, conversation_rounds)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            user2_id,
            f"测试报告内容{i+1} - 用户2报告",
            ["低", "中"][i % 2],
            f"这是用户2的第{i+1}份心理健康评估报告摘要",
            i + 2
        ))
    
    # 为用户2添加帖子
    cursor.execute('''
        INSERT INTO community_posts (title, content, category, author, author_id, risk_level)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ("需要帮助", "最近工作压力很大，有人能分享经验吗？", "help", "李小红", user2_id, "中"))
    
    # 为用户2添加评论
    cursor.execute('''
        INSERT INTO community_comments (post_id, content, author, author_id)
        VALUES (?, ?, ?, ?)
    ''', (2, "我也有同样的困扰，一起加油！", "匿名用户", "unknown"))
    
    # 为用户2添加操作日志
    for i in range(3):
        cursor.execute('''
            INSERT INTO user_action_logs (user_id, action_type, action_details)
            VALUES (?, ?, ?)
        ''', (user2_id, ["登录", "评论", "查看社区"][i % 3], f"用户操作{i+1}详情"))
    
    # 创建测试用户3
    user3_id = "test_user_003"
    
    # 为用户3添加报告
    cursor.execute('''
        INSERT INTO reports (user_id, report_text, risk_level, summary, conversation_rounds)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        user3_id,
        "测试报告内容 - 用户3报告",
        "低",
        "这是用户3的心理健康评估报告摘要",
        4
    ))
    
    # 为用户3添加操作日志
    for i in range(2):
        cursor.execute('''
            INSERT INTO user_action_logs (user_id, action_type, action_details)
            VALUES (?, ?, ?)
        ''', (user3_id, ["登录", "聊天"][i % 2], f"用户操作{i+1}详情"))
    
    # 为用户3添加评论
    cursor.execute('''
        INSERT INTO community_comments (post_id, content, author, author_id)
        VALUES (?, ?, ?, ?)
    ''', (1, "加油，一切都会好起来的！", "王大明", user3_id))
    
    # 提交数据
    conn.commit()
    conn.close()
    print("测试数据初始化完成！")
