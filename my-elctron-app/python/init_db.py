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

# 创建一级分类表
cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category_name TEXT UNIQUE NOT NULL
            )
        ''')
# 创建二级分类表
cursor.execute('''
            CREATE TABLE IF NOT EXISTS sub_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sub_category_name TEXT UNIQUE NOT NULL,
                category_id INTEGER NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
        ''')
default_data = {
        "食品酒水": ["早午晚餐", "饮料零食", "夜宵"],
        "交通出行": ["公共交通", "打车", "自行车"],
        "娱乐休闲": ["运动健身", "电影团建", "游戏"],
        "生活支出": ["水电煤", "日常用品", "话费"],
        "衣物形象": ["衣裤鞋帽", "化妆品","理发造型"],
        "旅游度假": ["住宿","门票","饮食","交通"],
    }
for category, sub_categories in default_data.items():
    # 插入一级分类
    cursor.execute("INSERT OR IGNORE INTO categories (category_name) VALUES (?)", (category,))
    # 获取刚插入的一级分类的ID
    cursor.execute("SELECT id FROM categories WHERE category_name = ?", (category,))
    category_id = cursor.fetchone()[0]
    # 插入二级分类
    for sub_category in sub_categories:
        cursor.execute(
            "INSERT OR IGNORE INTO sub_categories (sub_category_name, category_id) VALUES (?, ?)",
            (sub_category, category_id)
        )


# 提交更改并关闭连
conn.commit()
conn.close()

print("数据库和表结构初始化完成！")
