import argparse
import sqlite3

# 创建 ArgumentParser 对象
parser = argparse.ArgumentParser(description='database operations.')

# 添加 --ledgerName 参数
parser.add_argument('--ledgerName', type=str, required=True, help='The name of the new ledger.')

# 解析命令行参数
args = parser.parse_args()

# 获取 ledgerName 的值
ledger_name = args.ledgerName

# 连接到 SQLite 数据库（如果数据库不存在，则会自动创建）
conn = sqlite3.connect('ledger.db')
cursor = conn.cursor()

# 创建账本表（如果不存在）
cursor.execute('''
CREATE TABLE IF NOT EXISTS ledgers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
)
''')

# 插入新的账本名称
try:
    cursor.execute('INSERT INTO ledgers (name) VALUES (?)', (ledger_name,))
    conn.commit()
    print(f"账本 '{ledger_name}' 创建成功！")
except sqlite3.IntegrityError:
    print(f"账本 '{ledger_name}' 已存在，无法重复创建。")

# 关闭数据库连接
conn.close()