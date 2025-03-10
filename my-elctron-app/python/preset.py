import argparse
import sqlite3
import json
import sys
import os
from pathlib import Path

def get_ledger_name(ledger_id):
    """根据账本ID获取数据库名称"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT name FROM ledgers WHERE id = ?', (ledger_id,))
        result = cursor.fetchone()
        return result[0] if result else None

def handle_save(ledger_id, preset_name, records):
    ledger_name = get_ledger_name(ledger_id)
    if not ledger_name:
        return {'success': False, 'message': '账本不存在'}
    try:
        records_data = json.loads(records)  # 解析 JSON 字符串
    except json.JSONDecodeError:
        return {'success': False, 'message': '记录数据格式错误：'+records}
    db_path = Path(__file__).parent.parent / 'db' / f'{ledger_name}.db'
    with sqlite3.connect(db_path) as conn:
        # 检查重复名称
        cursor = conn.execute('SELECT id FROM presets WHERE name = ?', (preset_name,))
        if cursor.fetchone():
            return {'success': False, 'message': '预设名称重复'}
        
        # 插入新预设
        conn.execute(
            'INSERT INTO presets (name, records) VALUES (?, ?)',
            (preset_name, json.dumps(records_data))
        )
        return {'success': True}

def handle_list(ledger_id):
    ledger_name = get_ledger_name(ledger_id)
    if not ledger_name:
        return {'success': False, 'data': []}
    
    db_path = Path(__file__).parent.parent / 'db' / f'{ledger_name}.db'
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute('SELECT id, name FROM presets')
        return {
            'success': True,
            'data': [
                {'id': row['id'], 'name': row['name']} 
                for row in cursor.fetchall()
            ]
        }
def handle_detail(ledger_id, preset_id):
    """获取预设详情"""
    ledger_name = get_ledger_name(ledger_id)
    if not ledger_name:
        return {'success': False, 'data': []}
    
    db_path = Path(__file__).parent.parent / 'db' / f'{ledger_name}.db'
    # 需要先获取账本名称的逻辑
    with sqlite3.connect(db_path) as conn:
        cursor = conn.execute('SELECT records FROM presets WHERE id = ?', (preset_id,))
        result = cursor.fetchone()
        if not result:
            return {'success': False, 'message': '预设不存在'}
        return {
            'success': True,
            'data': {
                'records': json.loads(result[0])
            }
        }

def handle_import(ledger_id, preset_id):
    """导入预设"""
    # 获取预设记录
    preset_data = handle_detail(ledger_id,preset_id)
    if not preset_data['success']:
        return preset_data
    
    # 获取账本数据库连接
    ledger_name = get_ledger_name(ledger_id)
    if not ledger_name:
        return {'success': False, 'message': '账本不存在'}
    
    db_path = Path(__file__).parent.parent / 'db' / f'{ledger_name}.db'
    with sqlite3.connect(db_path) as conn:
        # 插入记录的逻辑
        imported = 0
        for record in preset_data['data']['records']:
            try:
                # 调用已有的插入方法
                insert_entry(conn, **record)
                imported += 1
            except:
                continue
        return {'success': True, 'imported': imported}
def main():
    parser = argparse.ArgumentParser(description='处理预设命令')
    parser.add_argument('--mode', type=str, required=True, help='操作模式（save/list）')
    parser.add_argument('--ledgerid', type=int, required=True, help='账本ID')
    parser.add_argument('--name', type=str, help='预设名称')
    parser.add_argument('--record', type=str, help='记录数据（JSON格式）')
    parser.add_argument('--id', type=int, help='预设ID')
    args = parser.parse_args()

    if args.mode == 'save':
        if not args.name or not args.record:
            print(json.dumps({'success': False, 'message': '缺少预设名称或记录数据'}))
            return
        result = handle_save(args.ledgerid, args.name, args.record)
        print(json.dumps(result))
    elif args.mode == 'list':
        result = handle_list(args.ledgerid)
        print(json.dumps(result))
    elif args.mode == 'detail':
        result = handle_detail(args.ledgerid, args.id)
        print(json.dumps(result))
    elif args.mode == 'import':
        result = handle_import(args.ledgerid, args.id)
        print(json.dumps(result))
    else:
        print(json.dumps({'success': False, 'message': '无效命令'}))

if __name__ == '__main__':
    main()
    
    