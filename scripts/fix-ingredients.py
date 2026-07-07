import json

with open('app/data/recipes.json', 'r', encoding='utf-8') as f:
    recipes = json.load(f)

# Comprehensive ingredient map
ingredient_map = {
    '什锦炒饭': [{'name': '米饭', 'amount': 300, 'unit': 'g', 'category': '主食厨房'}, {'name': '鸡蛋', 'amount': 2, 'unit': '个', 'category': '肉禽蛋品'}, {'name': '胡萝卜', 'amount': 50, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '玉米粒', 'amount': 50, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '青豆', 'amount': 50, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '葱', 'amount': 10, 'unit': 'g', 'category': '香辛料'}],
    '四季豆肉末包子': [{'name': '猪肉末', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '四季豆', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '中筋面粉', 'amount': 400, 'unit': 'g', 'category': '主食厨房'}, {'name': '酵母', 'amount': 4, 'unit': 'g', 'category': '调味干货'}, {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'}],
    '肉桂苹果吐司': [{'name': '吐司', 'amount': 4, 'unit': '片', 'category': '主食厨房'}, {'name': '苹果', 'amount': 1, 'unit': '个', 'category': '蔬菜菌菇'}, {'name': '肉桂粉', 'amount': 3, 'unit': 'g', 'category': '调味干货'}, {'name': '黄油', 'amount': 15, 'unit': 'g', 'category': '乳品'}],
    '肉肠手抓饼': [{'name': '手抓饼皮', 'amount': 2, 'unit': '张', 'category': '主食厨房'}, {'name': '肉肠', 'amount': 2, 'unit': '根', 'category': '肉禽蛋品'}, {'name': '鸡蛋', 'amount': 1, 'unit': '个', 'category': '肉禽蛋品'}],
    '纸杯小蛋糕': [{'name': '低筋面粉', 'amount': 120, 'unit': 'g', 'category': '主食厨房'}, {'name': '鸡蛋', 'amount': 3, 'unit': '个', 'category': '肉禽蛋品'}, {'name': '白砂糖', 'amount': 80, 'unit': 'g', 'category': '调味干货'}, {'name': '黄油', 'amount': 30, 'unit': 'g', 'category': '乳品'}],
    '木瓜椰奶西米露': [{'name': '木瓜', 'amount': 1, 'unit': '个', 'category': '蔬菜菌菇'}, {'name': '椰奶', 'amount': 200, 'unit': 'ml', 'category': '调味干货'}, {'name': '西米', 'amount': 50, 'unit': 'g', 'category': '主食厨房'}],
    '炸鸡': [{'name': '鸡腿', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '面粉', 'amount': 100, 'unit': 'g', 'category': '主食厨房'}, {'name': '鸡蛋', 'amount': 1, 'unit': '个', 'category': '肉禽蛋品'}],
    '煎鸡排饭': [{'name': '鸡腿肉', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '米饭', 'amount': 200, 'unit': 'g', 'category': '主食厨房'}, {'name': '鸡蛋', 'amount': 1, 'unit': '个', 'category': '肉禽蛋品'}],
    '爆三样': [{'name': '猪肝', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '猪腰', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '猪肚', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '青椒', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '拍黄瓜': [{'name': '黄瓜', 'amount': 2, 'unit': '根', 'category': '蔬菜菌菇'}, {'name': '蒜', 'amount': 15, 'unit': 'g', 'category': '香辛料'}, {'name': '小米辣', 'amount': 10, 'unit': 'g', 'category': '香辛料'}, {'name': '白醋', 'amount': 15, 'unit': 'ml', 'category': '调味干货'}],
    '干烧鱼块': [{'name': '鱼', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'}, {'name': '猪肉末', 'amount': 50, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '郫县豆瓣酱', 'amount': 15, 'unit': 'g', 'category': '调味干货'}],
    '干煸杏鲍菇': [{'name': '杏鲍菇', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '猪肉末', 'amount': 100, 'unit': 'g', 'category': '肉禽蛋品'}],
    '番茄牛腩': [{'name': '牛腩', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '番茄', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'}],
    '海鲜鲍鱼鸡大盆锅': [{'name': '鸡肉', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '鲍鱼', 'amount': 6, 'unit': '只', 'category': '海鲜水产'}, {'name': '虾', 'amount': 200, 'unit': 'g', 'category': '海鲜水产'}],
    '洋葱肥牛': [{'name': '肥牛卷', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '洋葱', 'amount': 150, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '生抽', 'amount': 20, 'unit': 'ml', 'category': '调味干货'}],
    '柠檬干煎鸡': [{'name': '鸡腿', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '柠檬', 'amount': 1, 'unit': '个', 'category': '蔬菜菌菇'}, {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'}],
    '泰式肉末拌饭': [{'name': '猪肉末', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '米饭', 'amount': 200, 'unit': 'g', 'category': '主食厨房'}, {'name': '小米辣', 'amount': 15, 'unit': 'g', 'category': '香辛料'}],
    '白灼虾': [{'name': '基围虾', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'}, {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'}, {'name': '葱', 'amount': 20, 'unit': 'g', 'category': '香辛料'}],
    '清蒸鲈鱼': [{'name': '鲈鱼', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'}, {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'}, {'name': '葱', 'amount': 20, 'unit': 'g', 'category': '香辛料'}],
    '香煎鱼': [{'name': '鱼', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'}, {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'}],
    '土豆烧排骨': [{'name': '排骨', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '土豆', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '冰糖', 'amount': 15, 'unit': 'g', 'category': '调味干货'}],
    '口蘑炒肉片': [{'name': '猪肉', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '口蘑', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '冬去春来饭': [{'name': '米饭', 'amount': 300, 'unit': 'g', 'category': '主食厨房'}, {'name': '腊肉', 'amount': 100, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '豌豆', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '排骨啫啫煲': [{'name': '排骨', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '洋葱', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '蒜', 'amount': 20, 'unit': 'g', 'category': '香辛料'}],
    '柠檬鸭': [{'name': '鸭子', 'amount': 800, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '柠檬', 'amount': 2, 'unit': '个', 'category': '蔬菜菌菇'}],
    '盐水鸭': [{'name': '鸭子', 'amount': 800, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '盐', 'amount': 30, 'unit': 'g', 'category': '调味干货'}, {'name': '花椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'}],
    '紫苏烧鸭': [{'name': '鸭子', 'amount': 800, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '紫苏叶', 'amount': 40, 'unit': 'g', 'category': '香辛料'}],
    '盐焗鸡': [{'name': '三黄鸡', 'amount': 1000, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '盐焗粉', 'amount': 30, 'unit': 'g', 'category': '调味干货'}],
    '葱姜鸡': [{'name': '三黄鸡', 'amount': 1000, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '大葱', 'amount': 100, 'unit': 'g', 'category': '香辛料'}, {'name': '姜', 'amount': 30, 'unit': 'g', 'category': '香辛料'}],
    '蒜泥白肉': [{'name': '五花肉', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '蒜', 'amount': 30, 'unit': 'g', 'category': '香辛料'}],
    '干锅花菜': [{'name': '花菜', 'amount': 400, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '五花肉', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'}],
    '辣子鸡': [{'name': '鸡肉', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '干辣椒', 'amount': 30, 'unit': 'g', 'category': '香辛料'}],
    '辣椒炒鸡': [{'name': '鸡肉', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '辣椒', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '酸菜鱼': [{'name': '黑鱼片', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'}, {'name': '酸菜', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '红酸汤米线': [{'name': '米线', 'amount': 200, 'unit': 'g', 'category': '主食厨房'}, {'name': '红酸汤底料', 'amount': 50, 'unit': 'g', 'category': '调味干货'}],
    '麻婆豆腐': [{'name': '嫩豆腐', 'amount': 400, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '猪肉末', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '郫县豆瓣酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'}],
    '水煮牛肉': [{'name': '牛里脊', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '豆芽', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '毛血旺': [{'name': '鸭血', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '毛肚', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '午餐肉', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'}],
    '小炒黄牛肉': [{'name': '黄牛肉', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '青椒', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '竹笋炒肉': [{'name': '猪肉', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '竹笋', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '西芹炒虾仁': [{'name': '虾仁', 'amount': 200, 'unit': 'g', 'category': '海鲜水产'}, {'name': '西芹', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'}],
    '蚝油生菜': [{'name': '生菜', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'}, {'name': '蚝油', 'amount': 20, 'unit': 'ml', 'category': '调味干货'}],
    '猪肚鸡': [{'name': '猪肚', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '鸡肉', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}],
    '糖醋排骨': [{'name': '排骨', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '白醋', 'amount': 30, 'unit': 'ml', 'category': '调味干货'}, {'name': '白砂糖', 'amount': 40, 'unit': 'g', 'category': '调味干货'}],
    '红烧排骨': [{'name': '排骨', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '冰糖', 'amount': 20, 'unit': 'g', 'category': '调味干货'}],
    '葱爆牛肉': [{'name': '牛里脊', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '大葱', 'amount': 150, 'unit': 'g', 'category': '香辛料'}],
    '沙茶牛肉': [{'name': '牛肉', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '沙茶酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'}],
    '咖喱鸡': [{'name': '鸡肉', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'}, {'name': '咖喱块', 'amount': 30, 'unit': 'g', 'category': '调味干货'}],
    '西班牙海鲜烩饭': [{'name': '虾', 'amount': 200, 'unit': 'g', 'category': '海鲜水产'}, {'name': '蛤蜊', 'amount': 200, 'unit': 'g', 'category': '海鲜水产'}, {'name': '米', 'amount': 200, 'unit': 'g', 'category': '主食厨房'}],
    '虾仁滑蛋': [{'name': '虾仁', 'amount': 200, 'unit': 'g', 'category': '海鲜水产'}, {'name': '鸡蛋', 'amount': 3, 'unit': '个', 'category': '肉禽蛋品'}],
    '葱姜炒蟹': [{'name': '蟹', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'}, {'name': '大葱', 'amount': 100, 'unit': 'g', 'category': '香辛料'}, {'name': '姜', 'amount': 20, 'unit': 'g', 'category': '香辛料'}],
}

# Keyword-based fallback
def generate_from_name(name, category):
    ingredients = []
    protein_map = {
        '牛腩': ('牛腩', 500), '肥牛': ('肥牛卷', 300), '猪蹄': ('猪蹄', 500),
        '猪肚': ('猪肚', 300), '排骨': ('排骨', 500), '牛': ('牛肉', 300),
        '猪': ('猪肉', 300), '鸡': ('鸡肉', 400), '鸭': ('鸭肉', 500),
        '鱼': ('鱼', 500), '虾': ('虾', 300), '蟹': ('蟹', 500),
        '兔': ('兔肉', 500), '羊': ('羊肉', 300),
    }
    veg_map = {
        '番茄': '番茄', '土豆': '土豆', '豆腐': '豆腐', '茄子': '茄子',
        '花菜': '花菜', '洋葱': '洋葱', '莴笋': '莴笋', '南瓜': '南瓜',
    }
    for kw, (pname, amount) in protein_map.items():
        if kw in name:
            ingredients.append({'name': pname, 'amount': amount, 'unit': 'g', 'category': '肉禽蛋品'})
            break
    for kw, vname in veg_map.items():
        if kw in name:
            ingredients.append({'name': vname, 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'})
            break
    ingredients.append({'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'})
    ingredients.append({'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'})
    ingredients.append({'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'})
    if '麻辣' in name or '水煮' in name:
        ingredients.append({'name': '干辣椒', 'amount': 15, 'unit': 'g', 'category': '香辛料'})
        ingredients.append({'name': '花椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'})
    return ingredients

updated = 0
for recipe in recipes:
    if len(recipe.get('ingredients', [])) > 0:
        continue
    ings = ingredient_map.get(recipe['name'], generate_from_name(recipe['name'], recipe.get('category', '')))
    recipe['ingredients'] = ings
    if 'collections' not in recipe:
        recipe['collections'] = []
    updated += 1

with open('app/data/recipes.json', 'w', encoding='utf-8') as f:
    json.dump(recipes, f, ensure_ascii=False, indent=2)
print(f"Updated {updated} recipes, total: {len(recipes)}")
