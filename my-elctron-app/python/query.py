import sqlite3
import argparse
import json
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
ledger_db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
os.makedirs(os.path.dirname(ledger_db_path), exist_ok=True)

def query_entries(ledger_id, year=None, month=None, category=None, subcategory=None, note=None, 
                 amount_min=None, amount_max=None, time_start=None, time_end=None, type=None):
    # 连接主数据库，查询账本名称
    conn = sqlite3.connect(ledger_db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM ledgers WHERE id = ?', (ledger_id,))
    ledger = cursor.fetchone()
    conn.close()

    if not ledger:
        raise ValueError('账本不存在')

    # 连接账本数据库，查询流水数据
    ledger_name = ledger[0]
    detail_db_path = os.path.join(current_dir, '..', 'db', f'{ledger_name}.db')
    conn = sqlite3.connect(detail_db_path)
    # print("opend ledger database")
    cursor = conn.cursor()

    # 构建查询条件
    query = 'SELECT * FROM entries WHERE 1=1'
    params = []

    # 时间范围查询（优先使用精确日期范围）
    if time_start or time_end:
        if time_start:
            query += ' AND date >= ?'
            params.append(time_start)
        if time_end:
            query += ' AND date <= ?'
            params.append(time_end)
    else:
        # 年月查询
        if year:
            query += ' AND strftime("%Y", date) = ?'
            params.append(f"{year:04d}")
        if month:
            query += ' AND strftime("%m", date) = ?'
            params.append(f"{month:02d}")

    # 分类条件更新为新的字段名
    if category:
        query += ' AND category_name = ?'  # 修改点1：category -> category_name
        params.append(category)
    if subcategory:
        query += ' AND sub_category_name = ?'  # 修改点2：subcategory -> sub_category_name
        params.append(subcategory)

    # 其他条件保持不变但字段验证
    if note:
        query += ' AND note LIKE ?'
        params.append(f'%{note}%')
    if amount_min is not None:
        query += ' AND amount >= ?'
        params.append(float(amount_min))
    if amount_max is not None:
        query += ' AND amount <= ?'
        params.append(float(amount_max))
    if type:
        query += ' AND type = ?'
        params.append(type)


    # 执行查询
    cursor.execute(query, params)
    entries = cursor.fetchall()
    conn.close()

    # 将结果转换为字典列表
    columns = [description[0] for description in cursor.description]
    result = [dict(zip(columns, entry)) for entry in entries]

    return result

def find_record(ledger_id, transaction_id):
    # 连接主数据库，查询账本名称
    conn = sqlite3.connect(ledger_db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM ledgers WHERE id = ?', (ledger_id,))
    ledger = cursor.fetchone()
    conn.close()

    if not ledger:
        raise ValueError('账本不存在')

    # 连接账本数据库，查询流水数据
    ledger_name = ledger[0]
    detail_db_path = os.path.join(current_dir, '..', 'db', f'{ledger_name}.db')
    conn = sqlite3.connect(detail_db_path)
    cursor = conn.cursor()

    # 构建查询条件
    query = 'SELECT * FROM entries WHERE id = ?'
    params = [transaction_id]

    # 执行查询
    cursor.execute(query, params)
    entry = cursor.fetchone()
    conn.close()

    if not entry:
        raise ValueError('交易记录不存在')

    # 将结果转换为字典
    columns = [description[0] for description in cursor.description]
    result = dict(zip(columns, entry))

    return result

def main():
    parser = argparse.ArgumentParser(description='查询账本流水')
    parser.add_argument('--ledgerid', required=True, help='账本ID')
    parser.add_argument('-y', '--year', type=int, help='年份')
    parser.add_argument('-m', '--month', type=int, help='月份')
    parser.add_argument('--category', help='类别')
    parser.add_argument('--note', help='备注')
    parser.add_argument('--amount', nargs=2, type=float, metavar=('least', 'most'), help='金额范围')
    parser.add_argument('--subcategory', help='二级分类')
    parser.add_argument('--type', choices=['支出', '收入'], help='收支类型')
    # 修改time参数解析
    parser.add_argument('--time', nargs=2, metavar=('start', 'end'), help='时间范围')
    parser.add_argument('--transactionId',type=int, help='交易ID')
    args = parser.parse_args()
    if args.transactionId:
        try:
            entry=find_record(args.ledgerid, args.transactionId)
            print(json.dumps(entry))
        except Exception as e:
            print(json.dumps({'error': str(e)}))
        return
    # 解析金额范围
    amount_min, amount_max = args.amount if args.amount else (None, None)
    # 解析时间范围
    time_start, time_end = args.time if args.time else (None, None)

    try:
        entries = query_entries(
        args.ledgerid,
        year=args.year,
        month=args.month,
        time_start=time_start,
        time_end=time_end,
        category=args.category,
        subcategory=args.subcategory,
        note=args.note,
        amount_min=amount_min,
        type=args.type,
            )
        print(json.dumps(entries))
    except Exception as e:
        print(json.dumps({'error': str(e)}))

if __name__ == '__main__':
    main()
