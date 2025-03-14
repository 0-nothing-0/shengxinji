import sqlite3
import sys
import json
import re
import subprocess
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
os.makedirs(os.path.dirname(db_path), exist_ok=True)
# 初始化数据库
def initialize_db():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # 创建 ledgers 表（如果不存在）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ledgers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

# 检查账本名称是否合法
def is_valid_ledger_name(ledger_name):
    if not ledger_name or ledger_name.strip() == "":
        return "empty"  # 名称为空
    # 检查是否包含非法字符（只允许中文、英文字母、数字、下划线）
    if not re.match(r'^[\u4e00-\u9fa5a-zA-Z0-9_]+$', ledger_name):
        return "illegal"  # 包含非法字符
    return "valid"

# 创建账本
def create_ledger(ledger_name):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 插入新的账本
        cursor.execute('INSERT INTO ledgers (name) VALUES (?)', (ledger_name,))
        conn.commit()
        ledger_id = cursor.lastrowid  # 获取新插入的账本 ID
        print(json.dumps({"status": "success", "ledger_id": ledger_id}))  # 返回成功信息和账本 ID
    except sqlite3.IntegrityError:
        print(json.dumps({"status": "repeated", "message": f"账本 '{ledger_name}' 已存在，无法重复创建！"}))  # 返回重复错误
    finally:
        conn.close()

if __name__ == "__main__":
    if sys.argv[1] == "clear" and sys.argv[2] == "yes":
        if os.path.exists(db_path):
            os.remove(db_path)
            print("数据库已清空")
    else:         
        initialize_db()  # 确保数据库和表存在

        if len(sys.argv) != 2:
            print(json.dumps({"status": "error", "message": "请提供账本名称作为参数！"}))
        else:
            ledger_name = sys.argv[1]
            validation_result = is_valid_ledger_name(ledger_name)
            if validation_result == "empty":
                print(json.dumps({"status": "empty", "message": "账本名称不能为空！"}))
            elif validation_result == "illegal":
                print(json.dumps({"status": "illegal", "message": "账本名称包含非法字符！"}))
            else:
                create_ledger(ledger_name)
                init_script_path = os.path.join(current_dir, 'init_db.py')
                subprocess.run(
                ["python", init_script_path, "--ledger_name", ledger_name],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )