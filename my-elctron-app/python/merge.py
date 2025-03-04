import sqlite3

def merge_category(conn, categories):
    """
    将多个分类合并到第一个分类（包括关联的子分类和收支记录）
    并删除被合并的冗余分类
    """
    if len(categories) < 2:
        return

    target_cat = categories[0]
    merge_cats = categories[1:]

    cursor = conn.cursor()
    try:
        # 获取目标分类ID
        cursor.execute("SELECT id FROM categories WHERE name=?", (target_cat,))
        target_id = cursor.fetchone()[0]
        
        # 处理每个待合并分类
        for cat_name in merge_cats:
            # 获取被合并分类ID
            cursor.execute("SELECT id FROM categories WHERE name=?", (cat_name,))
            if (cat_row := cursor.fetchone()) is None:
                continue
            old_cat_id = cat_row[0]

            # 更新关联的子分类
            cursor.execute("""
                UPDATE sub_categories 
                SET category_id = ?
                WHERE category_id = ?
            """, (target_id, old_cat_id))

            # 更新收支记录
            cursor.execute("""
                UPDATE entries 
                SET category_id = ?, category_name = ?
                WHERE category_id = ?
            """, (target_id, target_cat, old_cat_id))

            # 删除被合并分类
            cursor.execute("DELETE FROM categories WHERE id=?", (old_cat_id,))

        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        print(f"分类合并失败: {e}")

def merge_subcategory(conn, subcategories):
    """
    将多个子分类合并到第一个子分类（更新关联的收支记录）
    并删除被合并的冗余子分类
    """
    if len(subcategories) < 2:
        return

    target_sub = subcategories[0]
    merge_subs = subcategories[1:]

    cursor = conn.cursor()
    try:
        # 获取目标子分类信息
        cursor.execute("""
            SELECT s.id, c.name 
            FROM sub_categories s
            JOIN categories c ON s.category_id = c.id
            WHERE s.name = ?
        """, (target_sub,))
        target_id, cat_name = cursor.fetchone()

        # 处理每个待合并子分类
        for sub_name in merge_subs:
            # 获取被合并子分类ID
            cursor.execute("""
                SELECT id FROM sub_categories 
                WHERE name = ? 
                AND category_id = (
                    SELECT category_id 
                    FROM sub_categories 
                    WHERE name = ?
                )
            """, (sub_name, target_sub))
            if (sub_row := cursor.fetchone()) is None:
                continue
            old_sub_id = sub_row[0]

            # 更新收支记录
            cursor.execute("""
                UPDATE entries 
                SET sub_category_id = ?, sub_category_name = ?
                WHERE sub_category_id = ?
            """, (target_id, target_sub, old_sub_id))

            # 删除被合并子分类
            cursor.execute("DELETE FROM sub_categories WHERE id=?", (old_sub_id,))

        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        print(f"子分类合并失败: {e}")
