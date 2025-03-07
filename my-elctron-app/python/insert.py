import sqlite3
from datetime import datetime
def get_or_add_category(conn, category_name, sub_category_name):
    cursor = conn.cursor()
    
    # 如果主分类为空，直接返回 (None, None)
    if not category_name:
        return None, None

    # 处理主分类
    cursor.execute('SELECT id FROM categories WHERE category_name = ?', (category_name,))
    category = cursor.fetchone()
    if not category:
        cursor.execute('INSERT INTO categories (category_name) VALUES (?)', (category_name,))
        category_id = cursor.lastrowid
    else:
        category_id = category[0]

    # 如果子分类为空，返回 (category_id, None)
    if not sub_category_name:
        return category_id, None

    # 处理子分类
    cursor.execute('''SELECT id FROM sub_categories 
                       WHERE sub_category_name = ? AND category_id = ?''', 
                       (sub_category_name, category_id))
    sub_category = cursor.fetchone()
    if not sub_category:
        cursor.execute('''INSERT INTO sub_categories 
                            (sub_category_name, category_id) VALUES (?, ?)''', 
                         (sub_category_name, category_id))
        sub_category_id = cursor.lastrowid
    else:
        sub_category_id = sub_category[0]

    print(f"category_name: {category_name}, sub_category_name: {sub_category_name}")
    return category_id, sub_category_id




def insert_entry(conn, entry_type, amount, note, category_name, sub_category_name, transaction_time):
    try:
        cursor = conn.cursor()
        # 调试信息：查询表中的列并打印
        # cursor.execute("PRAGMA table_info(entries)")
        # columns = cursor.fetchall()
        # print("表中的列信息:", columns)
        # 获取或添加 category_id 和 sub_category_id
        category_id, sub_category_id = get_or_add_category(conn, category_name, sub_category_name)
        dt = datetime.strptime(transaction_time, "%Y/%m/%d %H:%M")
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
