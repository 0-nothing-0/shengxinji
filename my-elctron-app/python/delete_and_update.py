# delete_and_update.py
import sys
import json
import sqlite3
import os
from datetime import datetime

def get_db_path(ledger_id):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT name FROM ledgers WHERE id = ?', (ledger_id,))
        result = cursor.fetchone()
        if result:
            ledger_name = result[0]
            db_path = os.path.join(current_dir, '..', 'db', f"{ledger_name}.db")
            return db_path
    return None


def handle_update():
    mode = sys.argv[1]
    ledger_id = sys.argv[2]
    record_ids = json.loads(sys.argv[3])
    record_data = json.loads(sys.argv[4])
    
    conn = sqlite3.connect(get_db_path(ledger_id))
    cursor = conn.cursor()
    
    try:
        # 构建更新语句
        set_clause = ', '.join([f"{k} = ?" for k in record_data.keys()])
        params = list(record_data.values()) + record_ids
        
        query = f'''
            UPDATE entries 
            SET {set_clause}
            WHERE id IN ({','.join(['?']*len(record_ids))})
        '''
        
        cursor.execute(query, params)
        conn.commit()
        
        print(json.dumps({
            "success": True,
            "updated": cursor.rowcount
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": str(e)
        }))
    finally:
        conn.close()

def handle_delete():
    mode = sys.argv[1]
    ledger_id = sys.argv[2]
    try:
        record_ids = json.loads(sys.argv[3])
    except json.JSONDecodeError:
        return {'success': False, 'message': '记录数据格式错误'}
    
    conn = sqlite3.connect(get_db_path(ledger_id))
    cursor = conn.cursor()

    try:
        # 构建删除语句
        query = f'''
            DELETE FROM entries 
            WHERE id IN ({','.join(['?']*len(record_ids))})
        '''
        
        cursor.execute(query, record_ids)
        conn.commit()
        
        print(json.dumps({
            "success": True,
            "deleted": cursor.rowcount
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": str(e)
        }))
    finally:
        conn.close()


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "update":
        handle_update()
    elif mode == "delete":
        handle_delete()
