import sqlite3
import argparse

# 解析命令行参数
parser = argparse.ArgumentParser(description='Initialize or clear the ledger database.')
parser.add_argument('--clearledgers', action='store_true', help='Clear all data in the ledgers table')
args = parser.parse_args()

# 连接到 SQLite 数据库（如果不存在则会自动创建）
conn = sqlite3.connect('ledger.db')
cursor = conn.cursor()

# 创建账本表
cursor.execute('''
CREATE TABLE IF NOT EXISTS ledgers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
)
''')

# 创建账目表
cursor.execute('''
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ledger_id INTEGER NOT NULL,
    type TEXT NOT NULL,  -- 收支类型（income/expense）
    amount REAL NOT NULL,  -- 收支金额
    note TEXT,  -- 备注
    FOREIGN KEY (ledger_id) REFERENCES ledgers (id)
)
''')

# 如果 --clearledgers 参数被传递，则清除 ledgers 表中的所有数据
if args.clearledgers:
    cursor.execute('DELETE FROM ledgers')
    print("Ledgers table cleared.")

# 提交更改并关闭连接
conn.commit()
conn.close()

print("数据库和表结构初始化完成！")
