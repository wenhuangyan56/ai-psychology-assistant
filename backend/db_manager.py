import sqlite3
import os
import json
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.getenv('DATABASE_PATH', os.path.join(BASE_DIR, 'psych_data.db'))

def get_db_connection():
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.execute('PRAGMA journal_mode=WAL;')
        return conn
    except Exception as e:
        print(f"数据库连接失败: {e}")
        raise

def save_report(user_id, report_text, risk_level, summary, start_time=None, end_time=None, conversation_rounds=0, feature_vector=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    feature_vector_str = json.dumps(feature_vector) if feature_vector else None
    
    cursor.execute('''
        INSERT INTO reports (user_id, report_text, risk_level, summary, start_time, end_time, conversation_rounds, feature_vector)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, report_text, risk_level, summary, start_time, end_time, conversation_rounds, feature_vector_str))
    
    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return report_id

def get_reports_by_user(user_id, min_rounds=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if min_rounds > 0:
        cursor.execute('''
            SELECT id, report_text, risk_level, summary, start_time, end_time, created_at, conversation_rounds, feature_vector
            FROM reports WHERE user_id = ? AND conversation_rounds >= ? ORDER BY created_at DESC
        ''', (user_id, min_rounds))
    else:
        cursor.execute('''
            SELECT id, report_text, risk_level, summary, start_time, end_time, created_at, conversation_rounds, feature_vector
            FROM reports WHERE user_id = ? ORDER BY created_at DESC
        ''', (user_id,))
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_all_reports(min_rounds=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if min_rounds > 0:
        cursor.execute('''
            SELECT id, report_text, risk_level, summary, start_time, end_time, created_at, conversation_rounds, feature_vector
            FROM reports WHERE conversation_rounds >= ? ORDER BY created_at DESC
        ''', (min_rounds,))
    else:
        cursor.execute('''
            SELECT id, report_text, risk_level, summary, start_time, end_time, created_at, conversation_rounds, feature_vector
            FROM reports ORDER BY created_at DESC
        ''')
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def delete_all_reports(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM reports WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

def delete_report(report_id, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM reports WHERE id = ? AND user_id = ?', (report_id, user_id))
    conn.commit()
    conn.close()

def save_user_template(user_id, feature_vector, preferences=None, context_summary=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    feature_vector_str = json.dumps(feature_vector)
    preferences_str = json.dumps(preferences) if preferences else None
    
    cursor.execute('''
        INSERT OR REPLACE INTO user_templates 
        (user_id, feature_vector, preferences, context_summary, last_used_at, is_matched, is_main, main_user_id)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 0, 0, NULL)
    ''', (user_id, feature_vector_str, preferences_str, context_summary))
    
    conn.commit()
    conn.close()

def get_user_template(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, user_id, feature_vector, preferences, context_summary, total_reports, last_used_at, created_at, is_matched, is_main, main_user_id
        FROM user_templates WHERE user_id = ?
    ''', (user_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            'id': row[0],
            'user_id': row[1],
            'feature_vector': json.loads(row[2]) if row[2] else None,
            'preferences': json.loads(row[3]) if row[3] else None,
            'context_summary': row[4],
            'total_reports': row[5],
            'last_used_at': row[6],
            'created_at': row[7],
            'is_matched': bool(row[8]),
            'is_main': bool(row[9]),
            'main_user_id': row[10]
        }
    return None

def get_all_user_templates():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, user_id, feature_vector, preferences, context_summary, total_reports, last_used_at, created_at, is_matched, is_main, main_user_id
        FROM user_templates ORDER BY last_used_at DESC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    templates = []
    for row in rows:
        templates.append({
            'id': row[0],
            'user_id': row[1],
            'feature_vector': json.loads(row[2]) if row[2] else None,
            'preferences': json.loads(row[3]) if row[3] else None,
            'context_summary': row[4],
            'total_reports': row[5],
            'last_used_at': row[6],
            'created_at': row[7],
            'is_matched': bool(row[8]),
            'is_main': bool(row[9]),
            'main_user_id': row[10]
        })
    
    return templates

def get_templates_for_matching():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, user_id, feature_vector, preferences, context_summary, total_reports, last_used_at, created_at, is_matched, is_main, main_user_id
        FROM user_templates WHERE is_main = 1 OR (is_matched = 0 AND main_user_id IS NULL)
        ORDER BY created_at ASC
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    templates = []
    for row in rows:
        templates.append({
            'id': row[0],
            'user_id': row[1],
            'feature_vector': json.loads(row[2]) if row[2] else None,
            'preferences': json.loads(row[3]) if row[3] else None,
            'context_summary': row[4],
            'total_reports': row[5],
            'last_used_at': row[6],
            'created_at': row[7],
            'is_matched': bool(row[8]),
            'is_main': bool(row[9]),
            'main_user_id': row[10]
        })
    
    return templates

def mark_template_as_matched(user_id, main_user_id=None, is_main=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    update_fields = ['is_matched = 1']
    update_values = []
    
    if main_user_id:
        update_fields.append('main_user_id = ?')
        update_values.append(main_user_id)
    
    if is_main:
        update_fields.append('is_main = 1')
        update_fields.append('main_user_id = NULL')
    
    update_values.append(user_id)
    
    query = f'''
        UPDATE user_templates 
        SET {', '.join(update_fields)}
        WHERE user_id = ?
    '''
    cursor.execute(query, tuple(update_values))
    
    conn.commit()
    conn.close()

def get_related_user_ids(main_user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT user_id FROM user_templates 
        WHERE user_id = ? OR main_user_id = ?
    ''', (main_user_id, main_user_id))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [row[0] for row in rows]

def update_user_template(user_id, updates):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    update_fields = []
    update_values = []
    
    if 'feature_vector' in updates:
        update_fields.append('feature_vector = ?')
        update_values.append(json.dumps(updates['feature_vector']))
    
    if 'preferences' in updates:
        update_fields.append('preferences = ?')
        update_values.append(json.dumps(updates['preferences']))
    
    if 'context_summary' in updates:
        update_fields.append('context_summary = ?')
        update_values.append(updates['context_summary'])
    
    if 'total_reports' in updates:
        update_fields.append('total_reports = ?')
        update_values.append(updates['total_reports'])
    
    if update_fields:
        update_fields.append('last_used_at = CURRENT_TIMESTAMP')
        update_values.append(user_id)
        
        query = f'''
            UPDATE user_templates 
            SET {', '.join(update_fields)}
            WHERE user_id = ?
        '''
        cursor.execute(query, tuple(update_values))
    
    conn.commit()
    conn.close()

def delete_user_template(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM user_templates WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT user_id FROM reports ORDER BY user_id')
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]
