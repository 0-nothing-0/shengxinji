# python/get_months.py
import sqlite3
import json
import sys
import os
from collections import defaultdict

def main():
    ledger_id = sys.argv[1]
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
    
    # 连接主数据库获取账本名称
    main_conn = sqlite3.connect(db_path)
    main_cursor = main_conn.cursor()
    main_cursor.execute('SELECT name FROM ledgers WHERE id = ?', (ledger_id,))
    ledger_result = main_cursor.fetchone()
    
    if not ledger_result:
        print(json.dumps({"success": False, "message": "账本不存在"}))
        return

    ledger_name = ledger_result[0]
    main_conn.close()

    # 连接账本数据库
    ledger_db_path = os.path.join(current_dir, '..', 'db', f"{ledger_name}.db")
    conn = sqlite3.connect(ledger_db_path)
    cursor = conn.cursor()
    
    # 增强查询：过滤无效日期和空值
    cursor.execute('''
        SELECT 
            CAST(strftime('%Y', date) AS INTEGER) as year,
            CAST(strftime('%m', date) AS INTEGER) as month 
        FROM entries 
        WHERE 
            date IS NOT NULL 
            AND date != ''
            AND year IS NOT NULL 
            AND month IS NOT NULL
            AND year BETWEEN 1970 AND 2100  -- 合理年份范围
            AND month BETWEEN 1 AND 12      -- 有效月份范围
        GROUP BY year, month 
        ORDER BY year DESC, month DESC
    ''')
    
    year_months = defaultdict(list)
    for row in cursor.fetchall():
        year, month = row
        # 二次验证数据有效性
        if isinstance(year, int) and isinstance(month, int):
            year_months[str(year)].append(month)
    
    # 清理空键值
    year_months = {k: v for k, v in year_months.items() if v}
    
    print(json.dumps({
        "success": True,
        "data": year_months
    }))

if __name__ == '__main__':
    main()