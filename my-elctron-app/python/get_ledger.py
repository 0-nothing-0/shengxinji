import sqlite3
import sys
import json
from create_ledger import initialize_db
def get_ledgers():
    initialize_db()
    conn = sqlite3.connect('ledger.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, name FROM ledgers ORDER BY id DESC')  # 按ID倒序
    ledgers = cursor.fetchall()
    conn.close()
    return ledgers

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == 'get-ledgers':
        ledgers = get_ledgers()
        print(json.dumps(ledgers))  # 返回 JSON 格式的账本列表