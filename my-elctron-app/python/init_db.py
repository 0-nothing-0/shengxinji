import argparse
import sqlite3
import os

# 解析命令行参数
parser = argparse.ArgumentParser(description='Initialize or clear the ledger database.')
parser.add_argument('--clear', action='store_true', help='Clear all data in the table')
parser.add_argument('--ledger_name', type=str, default='ledger', help='Specify the name of the ledger database')
args = parser.parse_args()
current_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(current_dir, '..', 'db', f"{args.ledger_name}.db")

# 如果 --clear 参数被传递，则清除数据库中的所有数据
if args.clear:
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Database file {db_path} removed.")
    
# 重新建立连接
conn = sqlite3.connect(db_path)
cursor = conn.cursor()


# 创建账目表
cursor.execute('''
CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,  -- 收支类型
    amount REAL NOT NULL,  -- 收支金额
    note TEXT,  -- 备注
    category_id INTEGER,  -- 分类ID
    category_name TEXT,  -- 分类名称
    sub_category_id INTEGER,  -- 子分类ID
    sub_category_name TEXT,  -- 子分类名称
    date DATE NOT NULL,  -- 日期
    time TIME,  -- 时间
    FOREIGN KEY (category_id) REFERENCES categories (id),
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories (id)
)
''')


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

# 创建规则表
cursor.execute('''
               CREATE TABLE IF NOT EXISTS rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL,  
    category_id INTEGER NOT NULL,  
    FOREIGN KEY (category_id) REFERENCES categories (id)
            )
    ''')
#设置默认配置
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
default_rules = {
    "餐": "食品酒水",
    "公交": "交通出行",
    "地铁": "交通出行",
    "电影": "娱乐休闲",
    "游戏": "娱乐休闲",
    "水电": "生活缴费",
    "房租": "生活缴费",
    "医院": "医疗健康",
    "药店": "医疗健康",
}
for keyword, category_name in default_rules.items():
            # 获取或插入 category_id
            cursor.execute("SELECT id FROM categories WHERE category_name = ?", (category_name,))
            result = cursor.fetchone()
            if result:
                category_id = result[0]
            else:
                # 如果分类不存在，插入新分类
                cursor.execute("INSERT INTO categories (category_name) VALUES (?)", (category_name,))
                category_id = cursor.lastrowid

            # 插入规则
            cursor.execute("INSERT OR IGNORE INTO rules (keyword, category_id) VALUES (?, ?)", (keyword, category_id))
# 提交更改并关闭连接
conn.commit()
conn.close()

print("数据库和表结构初始化完成！")
