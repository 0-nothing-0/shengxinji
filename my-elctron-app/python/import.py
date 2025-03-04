import csv
import sqlite3
import sys
from insert import insert_entry 

# 连接到SQLite数据库（如果数据库不存在，则会自动创建）
db_name = sys.argv[2]
conn = sqlite3.connect(db_name+'.db')
cursor = conn.cursor()

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


def process_csv_and_store_to_db(csv_file_path):
    # 尝试用不同的编码读取CSV文件
    encodings = ['utf-8', 'gbk', 'gb18030', 'big5']  # 常见的中文编码
    used_encoding = try_read_csv(csv_file_path, encodings)

    if used_encoding is None:
        print(f"错误：无法读取文件 {csv_file_path}，尝试的编码包括: {', '.join(encodings)}")
        return

    print(f"成功以编码 {used_encoding} 读取文件 {csv_file_path}")

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
        
        # 遍历CSV文件的每一行
        for row in csv_reader:
           # print(row)
            # 判断交易状态是否包含“成功”
            if "成功" in row.get('交易状态', ''):
                # 提取所需的列
                transaction_time = row.get('交易时间', '')
                transaction_type = row.get('收/支', '')
                amount_str = row.get('金额', '').replace(',', '')  # 去除逗号
                description_fields = [
                        row.get('交易对方', ''),
                        row.get('商品', ''),
                        row.get('交易分类', ''),
                        row.get('对方账号', ''),
                        row.get('商品说明', ''),
                    ]
                description = " ".join([field for field in description_fields if field])
                try:
                    amount = float(amount_str)  # 尝试将金额转换为浮点数
                except ValueError:
                    print(f"警告：金额格式错误，跳过此行。金额值: {amount_str}")
                    continue
                category_id,category_name = guess_category(description)

                # 插入数据到数据库表中
                insert_entry(conn, transaction_type, amount, description, category_name, None, transaction_time)
                print(f"已插入一笔交易记录: {transaction_time}, {transaction_type}, {amount}, {description}, 分类ID: {category_id}")

        # 提交事务
        conn.commit()
        print(f"数据已成功存储到数据库。")

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
        csv_file_path = sys.argv[1]
        db_name = sys.argv[2]
        process_csv_and_store_to_db(csv_file_path)
