import sqlite3
import sys
import json

def get_ledgers():
    conn = sqlite3.connect('ledger.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, name FROM ledgers')
    ledgers = cursor.fetchall()
    conn.close()
    return ledgers

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == 'get-ledgers':
        ledgers = get_ledgers()
        print(json.dumps(ledgers))  # 返回 JSON 格式的账本列表