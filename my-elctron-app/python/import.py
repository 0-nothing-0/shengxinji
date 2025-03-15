import csv
import sqlite3
import sys
from insert import insert_entry 
import os
from datetime import datetime
import json

current_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(current_dir, '..', 'db', 'ledger.db')
csv_file_path = ""
db_ledgerid = 0

def try_read_csv(file_path, encodings):
    """尝试用不同的编码读取CSV文件"""
    for encoding in encodings:
        try:
            with open(file_path, mode='r', encoding=encoding) as csv_file:
                # 尝试读取前几行以确认编码是否正确
                csv_file.readlines()
                csv_file.seek(0)  # 重置文件指针
                return encoding
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"尝试编码 {encoding} 时发生错误: {e}")
    return None

def guess_category(conn, description):
    """
    根据描述信息猜测交易类型
    :param conn: 数据库连接
    :param description: 交易的综合描述信息
    :return: (category_name, category_id) 或 (None, None)
    """
    # 从 rules 表中读取所有关键词和分类映射
    cursor.execute("SELECT keyword, category_id FROM rules")
    rules = cursor.fetchall()

    # 遍历规则，匹配关键词
    for keyword, category_id in rules:
        if keyword in description:
            # 获取分类名称
            cursor.execute("SELECT category_name FROM categories WHERE id = ?", (category_id,))
            category_name = cursor.fetchone()[0]
            return category_name, category_id
    return None, None  # 如果没有匹配到分类，返回 (None, None)


def process_csv_and_store_to_db(conn,csv_file_path):
    # 尝试用不同的编码读取CSV文件
    encodings = ['utf-8', 'gbk', 'gb18030', 'big5']  # 常见的中文编码
    used_encoding = try_read_csv(csv_file_path, encodings)

    if used_encoding is None:
        return {"success": False, "message": "文件编码不支持"}


    try:
        # 手动打开文件
        csv_file = open(csv_file_path, mode='r', encoding=used_encoding)

        # 跳过前面的冗余信息行
        max_lines = 30  
        line_count = 0
        while True:
            line = csv_file.readline()
            line_count += 1
            if "交易时间" in line:  # 假设表头行包含“交易时间”
                break
            if line_count >= max_lines:
                raise ValueError(f"在前 {max_lines} 行中未找到关键词 '交易时间'")

        if not line:
            raise ValueError(f"文件 {csv_file_path} 结束时未找到关键词 '交易时间'")
        csv_file.seek(0)
        # 移动到表头行
        while line_count > 1:
            line = csv_file.readline()
            line_count -= 1
        
        # 使用csv.DictReader读取CSV文件
        csv_reader = csv.DictReader(csv_file)

        

        # 创建表（如果表不存在）
        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS entries (
                transaction_time TEXT,
                transaction_type TEXT,
                amount REAL
            )
        ''')
        entries = []    
        # 遍历CSV文件的每一行
                # 预处理字段映射（在循环外判断一次即可）
        amount_column = '金额(元)' if '金额(元)' in csv_reader.fieldnames else '金额'
        status_column = '交易状态' if '交易状态' in csv_reader.fieldnames else '当前状态'
        goods_column = '商品' if '商品' in csv_reader.fieldnames else '商品说明'

        for row in csv_reader:
                # 统一判断交易状态列名
                if "成功" not in row.get(status_column, ''):
                    continue

                # 统一处理金额列
                amount_str = row.get(amount_column, '').replace(',', '').replace('¥', '') 
                
                # 统一商品信息字段
                description_fields = [
                    row.get('交易对方', ''),
                    row.get(goods_column, ''),
                    row.get('交易分类', ''),
                    row.get('对方账号', ''),
                    row.get('备注', '')  # 新增备注字段
                ]
                
                # 剩余代码保持不变...
                transaction_time = row.get('交易时间', '')
                transaction_type = row.get('收/支', '')
                try:
                    amount = float(amount_str)
                except ValueError:
                    print(f"警告：金额格式错误，跳过此行。金额值: {amount_str}")
                    continue
                
                description = " ".join([field for field in description_fields if field])
                category_name,category_id=guess_category(conn,description)
                # 插入数据到数据库表中
                insert_entry(conn, transaction_type, amount, description, category_name, None, transaction_time)
                #print("ok")
                dt = datetime.strptime(transaction_time, "%Y/%m/%d %H:%M")
                date_part = dt.strftime("%Y-%m-%d")
                time_part = dt.strftime("%H:%M")
                entries.append({
                'type': transaction_type,
                'date': date_part,
                'time': time_part,
                'amount': amount,
                'note': description,
                "category_name" : category_name,
            })

        # 提交事务
        conn.commit()
        return {"success": True, "entries": entries}

    except KeyError as e:
        print(f"错误：CSV文件缺少必要的列: {e}")
    except Exception as e:
        print(f"处理CSV文件时发生错误: {e}")
    finally:
        # 关闭文件和数据连接
        if csv_file:
            csv_file.close()
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python process_csv.py <csv_file_path> <db_table_name>")
    else:
        # 连接主数据库，查询账本名称
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        db_ledgerid = sys.argv[2]
        csv_file_path = sys.argv[1]
        cursor.execute('SELECT name FROM ledgers WHERE id = ?', (db_ledgerid,))
        ledger = cursor.fetchone()
        conn.close()

        if not ledger:
            raise ValueError('账本不存在')

        # 连接账本数据库
        ledger_name = ledger[0]
        detail_db_path = os.path.join(current_dir, '..', 'db', f'{ledger_name}.db')
        conn = sqlite3.connect(detail_db_path)
        cursor = conn.cursor()
        result = process_csv_and_store_to_db(conn, csv_file_path)
        print(json.dumps(result))
