import sqlite3
from datetime import datetime
def get_or_add_category(conn, category_name, sub_category_name):
    cursor = conn.cursor()
    # 查询或添加 category
    cursor.execute('SELECT id FROM categories WHERE name = ?', (category_name,))
    category = cursor.fetchone()
    if category is None:
        cursor.execute('INSERT INTO categories (name) VALUES (?)', (category_name,))
        category_id = cursor.lastrowid
    else:
        category_id = category[0]
    
    # 查询或添加 sub_category
    cursor.execute('SELECT id FROM sub_categories WHERE name = ? AND category_id = ?', (sub_category_name, category_id))
    sub_category = cursor.fetchone()
    if sub_category is None:
        cursor.execute('INSERT INTO sub_categories (name, category_id) VALUES (?, ?)', (sub_category_name, category_id))
        sub_category_id = cursor.lastrowid
    else:
        sub_category_id = sub_category[0]
    
    return category_id, sub_category_id

def insert_entry(conn, entry_type, amount, note, category_name, sub_category_name, transaction_time):
    try:
        cursor = conn.cursor()
        # 获取或添加 category_id 和 sub_category_id
        category_id, sub_category_id = get_or_add_category(conn, category_name, sub_category_name)
        dt = transaction_time.strptime(transaction_time, "%Y/%m/%d %H:%M")
        date_part = dt.strftime("%Y-%m-%d")
        time_part = dt.strftime("%H:%M")
        # 插入
        # 插入数据到指定的表
        cursor.execute(f'''
            INSERT INTO entries (
                 type, amount, note, category_id, category_name,
                sub_category_id, sub_category_name, date, time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            entry_type, amount, note, category_id, category_name,
            sub_category_id, sub_category_name, date_part, time_part
        ))
        # 提交事务
        conn.commit()
        # 返回插入的记录ID
        return cursor.lastrowid
    except sqlite3.Error as e:
        print(f"插入收支记录失败: {e}")
        return None
