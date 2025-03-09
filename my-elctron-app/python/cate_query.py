import sqlite3
import argparse
import json
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
ledger_db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
os.makedirs(os.path.dirname(ledger_db_path), exist_ok=True)

def get_categories(ledger_id):
    # 连接主数据库，查询账本名称
    conn = sqlite3.connect(ledger_db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM ledgers WHERE id = ?', (ledger_id,))
    ledger = cursor.fetchone()
    conn.close()

    if not ledger:
        raise ValueError('账本不存在')

    # 连接账本数据库，查询分类名称
    ledger_name = ledger[0]
    detail_db_path = os.path.join(current_dir, '..', 'db', f'{ledger_name}.db')
    conn = sqlite3.connect(detail_db_path)
    cursor = conn.cursor()

    # 查询主分类
    cursor.execute('SELECT id, category_name FROM categories')
    main_categories = cursor.fetchall()

    categories = []
    for main_category in main_categories:
        main_category_id, main_category_name = main_category
        # 查询子分类
        cursor.execute('SELECT id, sub_category_name FROM sub_categories WHERE category_id = ?', (main_category_id,))
        sub_categories = cursor.fetchall()

        # 构建分类结构
        category_info = {
            "id": main_category_id,
            "name": main_category_name,
            "sub_categories": [{"id": sub_id, "name": sub_name} for sub_id, sub_name in sub_categories]
        }
        categories.append(category_info)

    conn.close()
    return categories

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='查询分类信息')
    parser.add_argument('ledger_id', type=int, help='账本ID')
    args = parser.parse_args()

    try:
        categories = get_categories(args.ledger_id)
        print(json.dumps(categories))
    except ValueError as e:
        print(json.dumps({"error": str(e)}))
