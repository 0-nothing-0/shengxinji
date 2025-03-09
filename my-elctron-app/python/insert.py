import sqlite3
import sys
import json
import os
from datetime import datetime
def parse_transaction_time(transaction_time):
    """解析时间字符串，兼容斜杠和短横线格式"""
    supported_formats = [
        "%Y-%m-%d %H:%M:%S",  
        "%Y-%m-%d %H:%M",     
        "%Y/%m/%d %H:%M:%S",  
        "%Y/%m/%d %H:%M",    
    ]
    for fmt in supported_formats:
        try:
            dt = datetime.strptime(transaction_time, fmt)
            return dt
        except ValueError:
            continue  

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

    #print(f"category_name: {category_name}, sub_category_name: {sub_category_name}")
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
        dt = parse_transaction_time(transaction_time)
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

def get_db_connection(ledger_id):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 连接主数据库查询账本名称
    main_db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
    os.makedirs(os.path.dirname(main_db_path), exist_ok=True)
    
    try:
        main_conn = sqlite3.connect(main_db_path)
        cursor = main_conn.cursor()
        cursor.execute('SELECT name FROM ledgers WHERE id = ?', (ledger_id,))
        ledger = cursor.fetchone()
        
        if not ledger:
            raise ValueError(f"Ledger ID {ledger_id} not found")
            
        ledger_name = ledger[0]
        detail_db_path = os.path.join(current_dir, '..', 'db', f'{ledger_name}.db')
        
        # 连接详细数据库并初始化表
        detail_conn = sqlite3.connect(detail_db_path)
        return detail_conn
        
    except sqlite3.Error as e:
        raise RuntimeError(f"Database error: {str(e)}")
    finally:
        if 'main_conn' in locals():
            main_conn.close()
def insert_entry_via_ledgerid(ledger_id, record):
    """新增调用入口（不破坏原有接口）"""
    try:
        conn = get_db_connection(ledger_id)
        entry_id = insert_entry(
            conn,
            entry_type=record['type'],
            amount=record['amount'],
            note=record.get('note', ''),
            category_name=record.get('category_name', ''),
            sub_category_name=record.get('sub_category_name', ''),
            transaction_time=record['transaction_time']
        )
        return {"success": True, "id": entry_id}
    except Exception as e:
        return {"success": False, "message": str(e)}
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"success": False, "message": "参数不足"}))
        sys.exit(1)
        
    try:
        command = sys.argv[1]
        ledger_id = int(sys.argv[2])
        record = json.loads(sys.argv[3])
        
        if command == "add-entry":
            result = insert_entry_via_ledgerid(ledger_id, record)
            print(json.dumps(result))
        else:
            print(json.dumps({"success": False, "message": "无效命令"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "message": str(e)}))