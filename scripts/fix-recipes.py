import json

with open('app/data/recipes.json', 'r', encoding='utf-8') as f:
    recipes = json.load(f)

# Exact ingredient matches for known dishes
ingredient_db = {
    '回锅肉': [
        {'name': '五花肉', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '蒜苗', 'amount': 150, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '郫县豆瓣酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '辣椒炒肉': [
        {'name': '五花肉', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '螺丝椒', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '麻婆豆腐': [
        {'name': '嫩豆腐', 'amount': 400, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '猪肉末', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '郫县豆瓣酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
        {'name': '花椒粉', 'amount': 5, 'unit': 'g', 'category': '香辛料'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '水煮牛肉': [
        {'name': '牛里脊', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '豆芽', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '郫县豆瓣酱', 'amount': 25, 'unit': 'g', 'category': '调味干货'},
        {'name': '干辣椒', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '花椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '毛血旺': [
        {'name': '鸭血', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '毛肚', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '午餐肉', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '豆芽', 'amount': 150, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '干辣椒', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
    ],
    '酸菜鱼': [
        {'name': '黑鱼片', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '酸菜', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '泡椒', 'amount': 30, 'unit': 'g', 'category': '香辛料'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '蒜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
    ],
    '红烧排骨': [
        {'name': '猪小排', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '冰糖', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
        {'name': '生抽', 'amount': 30, 'unit': 'ml', 'category': '调味干货'},
        {'name': '老抽', 'amount': 10, 'unit': 'ml', 'category': '调味干货'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
    ],
    '糖醋排骨': [
        {'name': '猪小排', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '白醋', 'amount': 30, 'unit': 'ml', 'category': '调味干货'},
        {'name': '白砂糖', 'amount': 40, 'unit': 'g', 'category': '调味干货'},
        {'name': '番茄酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
    ],
    '小炒黄牛肉': [
        {'name': '黄牛肉', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '青椒', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '小米辣', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '葱爆牛肉': [
        {'name': '牛里脊', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '大葱', 'amount': 150, 'unit': 'g', 'category': '香辛料'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
    ],
    '洋葱肥牛': [
        {'name': '肥牛卷', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '洋葱', 'amount': 150, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '生抽', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
        {'name': '蚝油', 'amount': 10, 'unit': 'ml', 'category': '调味干货'},
    ],
    '蒜泥白肉': [
        {'name': '五花肉', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '蒜', 'amount': 30, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
        {'name': '辣椒油', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '盐水鸭': [
        {'name': '鸭子', 'amount': 800, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '盐', 'amount': 30, 'unit': 'g', 'category': '调味干货'},
        {'name': '花椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '姜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
    ],
    '豉油鸡': [
        {'name': '三黄鸡', 'amount': 1000, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '生抽', 'amount': 80, 'unit': 'ml', 'category': '调味干货'},
        {'name': '老抽', 'amount': 30, 'unit': 'ml', 'category': '调味干货'},
        {'name': '冰糖', 'amount': 30, 'unit': 'g', 'category': '调味干货'},
        {'name': '姜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
    ],
    '干锅花菜': [
        {'name': '花菜', 'amount': 400, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '五花肉', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '干锅酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '番茄鸡蛋打卤面': [
        {'name': '番茄', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '鸡蛋', 'amount': 3, 'unit': '个', 'category': '肉禽蛋品'},
        {'name': '面条', 'amount': 200, 'unit': 'g', 'category': '主食厨房'},
        {'name': '葱', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '油豆腐烧肉': [
        {'name': '五花肉', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '油豆腐', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '冰糖', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
        {'name': '生抽', 'amount': 25, 'unit': 'ml', 'category': '调味干货'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
    ],
    '凉拌鲫鱼': [
        {'name': '鲫鱼', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '小米辣', 'amount': 50, 'unit': 'g', 'category': '香辛料'},
        {'name': '蒜', 'amount': 30, 'unit': 'g', 'category': '香辛料'},
        {'name': '香菜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 30, 'unit': 'ml', 'category': '调味干货'},
    ],
    '孜然糊辣牛肉': [
        {'name': '牛里脊', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '干辣椒', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '花椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '孜然粉', 'amount': 15, 'unit': 'g', 'category': '调味干货'},
    ],
    '紫苏干煎鸭': [
        {'name': '鸭子', 'amount': 800, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '紫苏叶', 'amount': 40, 'unit': 'g', 'category': '香辛料'},
        {'name': '姜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '料酒', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
    ],
    '芥末咖喱罗氏虾': [
        {'name': '罗氏虾', 'amount': 600, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '咖喱块', 'amount': 30, 'unit': 'g', 'category': '调味干货'},
        {'name': '芥末酱', 'amount': 15, 'unit': 'g', 'category': '调味干货'},
        {'name': '蒜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
    ],
    '尖椒肉丝': [
        {'name': '猪里脊', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '螺丝椒', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '番茄土豆炖牛腩': [
        {'name': '牛腩', 'amount': 600, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '番茄', 'amount': 400, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '土豆', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
    ],
    '螺蛳粉': [
        {'name': '螺蛳粉', 'amount': 1, 'unit': '包', 'category': '主食厨房'},
        {'name': '鸡蛋', 'amount': 1, 'unit': '个', 'category': '肉禽蛋品'},
        {'name': '青菜', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'},
    ],
    '香芹豆干炒肉': [
        {'name': '猪肉', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '豆干', 'amount': 150, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '香芹', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '豆干烧兔子': [
        {'name': '兔肉', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '豆干', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '郫县豆瓣酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '蒜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
    ],
    '辣猪蹄': [
        {'name': '猪蹄', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '干辣椒', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '花椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 25, 'unit': 'ml', 'category': '调味干货'},
    ],
    '酸辣猪蹄': [
        {'name': '猪蹄', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '小米辣', 'amount': 30, 'unit': 'g', 'category': '香辛料'},
        {'name': '白醋', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
        {'name': '蒜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
    ],
    '雪菜肉末面': [
        {'name': '猪肉末', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '雪菜', 'amount': 150, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '面条', 'amount': 200, 'unit': 'g', 'category': '主食厨房'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '排骨啫啫煲': [
        {'name': '排骨', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '洋葱', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '蒜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '蚝油', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
    ],
    '辣子鸡': [
        {'name': '鸡肉', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '干辣椒', 'amount': 30, 'unit': 'g', 'category': '香辛料'},
        {'name': '花椒', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
    ],
    '油豆腐炒肉': [
        {'name': '猪肉', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '油豆腐', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '莴笋烧肚条': [
        {'name': '猪肚', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '莴笋', 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '小米辣', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '什锦炒饭': [
        {'name': '米饭', 'amount': 300, 'unit': 'g', 'category': '主食厨房'},
        {'name': '鸡蛋', 'amount': 2, 'unit': '个', 'category': '肉禽蛋品'},
        {'name': '胡萝卜', 'amount': 50, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '玉米粒', 'amount': 50, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '青豆', 'amount': 50, 'unit': 'g', 'category': '蔬菜菌菇'},
    ],
    '四季豆肉末包子': [
        {'name': '猪肉末', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '四季豆', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '中筋面粉', 'amount': 400, 'unit': 'g', 'category': '主食厨房'},
        {'name': '酵母', 'amount': 4, 'unit': 'g', 'category': '调味干货'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '肉桂苹果吐司': [
        {'name': '吐司', 'amount': 4, 'unit': '片', 'category': '主食厨房'},
        {'name': '苹果', 'amount': 1, 'unit': '个', 'category': '蔬菜菌菇'},
        {'name': '肉桂粉', 'amount': 3, 'unit': 'g', 'category': '调味干货'},
        {'name': '黄油', 'amount': 15, 'unit': 'g', 'category': '乳品'},
        {'name': '蜂蜜', 'amount': 10, 'unit': 'ml', 'category': '调味干货'},
    ],
    '肉肠手抓饼': [
        {'name': '手抓饼皮', 'amount': 2, 'unit': '张', 'category': '主食厨房'},
        {'name': '肉肠', 'amount': 2, 'unit': '根', 'category': '肉禽蛋品'},
        {'name': '鸡蛋', 'amount': 1, 'unit': '个', 'category': '肉禽蛋品'},
    ],
    '纸杯小蛋糕': [
        {'name': '低筋面粉', 'amount': 120, 'unit': 'g', 'category': '主食厨房'},
        {'name': '鸡蛋', 'amount': 3, 'unit': '个', 'category': '肉禽蛋品'},
        {'name': '白砂糖', 'amount': 80, 'unit': 'g', 'category': '调味干货'},
        {'name': '黄油', 'amount': 30, 'unit': 'g', 'category': '乳品'},
        {'name': '牛奶', 'amount': 30, 'unit': 'ml', 'category': '乳品'},
    ],
    '木瓜椰奶西米露': [
        {'name': '木瓜', 'amount': 1, 'unit': '个', 'category': '蔬菜菌菇'},
        {'name': '椰奶', 'amount': 200, 'unit': 'ml', 'category': '调味干货'},
        {'name': '西米', 'amount': 50, 'unit': 'g', 'category': '主食厨房'},
        {'name': '白砂糖', 'amount': 30, 'unit': 'g', 'category': '调味干货'},
    ],
    '炸鸡': [
        {'name': '鸡腿', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '面粉', 'amount': 100, 'unit': 'g', 'category': '主食厨房'},
        {'name': '鸡蛋', 'amount': 1, 'unit': '个', 'category': '肉禽蛋品'},
        {'name': '辣椒粉', 'amount': 5, 'unit': 'g', 'category': '香辛料'},
        {'name': '蒜粉', 'amount': 5, 'unit': 'g', 'category': '香辛料'},
    ],
    '煎鸡排饭': [
        {'name': '鸡腿肉', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '米饭', 'amount': 200, 'unit': 'g', 'category': '主食厨房'},
        {'name': '鸡蛋', 'amount': 1, 'unit': '个', 'category': '肉禽蛋品'},
        {'name': '面包糠', 'amount': 50, 'unit': 'g', 'category': '主食厨房'},
    ],
    '爆三样': [
        {'name': '猪肝', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '猪腰', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '猪肚', 'amount': 150, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '青椒', 'amount': 100, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '拍黄瓜': [
        {'name': '黄瓜', 'amount': 2, 'unit': '根', 'category': '蔬菜菌菇'},
        {'name': '蒜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '小米辣', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '白醋', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '干烧鱼块': [
        {'name': '鱼', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '猪肉末', 'amount': 50, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '郫县豆瓣酱', 'amount': 15, 'unit': 'g', 'category': '调味干货'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
    ],
    '干煸杏鲍菇': [
        {'name': '杏鲍菇', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '猪肉末', 'amount': 100, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '干辣椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '花椒', 'amount': 5, 'unit': 'g', 'category': '香辛料'},
    ],
    '番茄牛腩': [
        {'name': '牛腩', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '番茄', 'amount': 300, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '番茄酱', 'amount': 20, 'unit': 'g', 'category': '调味干货'},
    ],
    '海鲜鲍鱼鸡大盆锅': [
        {'name': '鸡肉', 'amount': 500, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '鲍鱼', 'amount': 6, 'unit': '只', 'category': '海鲜水产'},
        {'name': '虾', 'amount': 200, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '姜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '蒜', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
    ],
    '洋葱肥牛': [
        {'name': '肥牛卷', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '洋葱', 'amount': 150, 'unit': 'g', 'category': '蔬菜菌菇'},
        {'name': '生抽', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
        {'name': '蚝油', 'amount': 10, 'unit': 'ml', 'category': '调味干货'},
    ],
    '柠檬干煎鸡': [
        {'name': '鸡腿', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '柠檬', 'amount': 1, 'unit': '个', 'category': '蔬菜菌菇'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
    '泰式肉末拌饭': [
        {'name': '猪肉末', 'amount': 200, 'unit': 'g', 'category': '肉禽蛋品'},
        {'name': '米饭', 'amount': 200, 'unit': 'g', 'category': '主食厨房'},
        {'name': '小米辣', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '鱼露', 'amount': 10, 'unit': 'ml', 'category': '调味干货'},
        {'name': '青柠', 'amount': 1, 'unit': '个', 'category': '蔬菜菌菇'},
    ],
    '白灼虾': [
        {'name': '基围虾', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '葱', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
    ],
    '清蒸鲈鱼': [
        {'name': '鲈鱼', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '姜', 'amount': 15, 'unit': 'g', 'category': '香辛料'},
        {'name': '葱', 'amount': 20, 'unit': 'g', 'category': '香辛料'},
        {'name': '生抽', 'amount': 20, 'unit': 'ml', 'category': '调味干货'},
    ],
    '香煎鱼': [
        {'name': '鱼', 'amount': 500, 'unit': 'g', 'category': '海鲜水产'},
        {'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'},
        {'name': '盐', 'amount': 5, 'unit': 'g', 'category': '调味干货'},
        { 'name': '料酒', 'amount': 15, 'unit': 'ml', 'category': '调味干货'},
    ],
}

# Keyword-based generation for dishes not in explicit map
def generate_ingredients_from_name(name, category):
    ingredients = []

    # Detect main protein
    protein_map = {
        '牛腩': ('牛腩', 500), '肥牛': ('肥牛卷', 300), '猪蹄': ('猪蹄', 500),
        '猪肚': ('猪肚', 300), '排骨': ('排骨', 500), '牛': ('牛肉', 300),
        '猪': ('猪肉', 300), '鸡': ('鸡肉', 400), '鸭': ('鸭肉', 500),
        '鱼': ('鱼', 500), '虾': ('虾', 300), '蟹': ('蟹', 500),
        '兔': ('兔肉', 500), '羊': ('羊肉', 300),
    }

    detected_protein = None
    for kw, (protein_name, amount) in protein_map.items():
        if kw in name:
            detected_protein = {'name': protein_name, 'amount': amount, 'unit': 'g', 'category': '肉禽蛋品'}
            break

    if detected_protein:
        ingredients.append(detected_protein)

    # Detect vegetable
    veg_map = {
        '番茄': '番茄', '土豆': '土豆', '豆腐': '豆腐', '茄子': '茄子',
        '花菜': '花菜', '洋葱': '洋葱', '莴笋': '莴笋', '竹笋': '竹笋',
        '莲藕': '莲藕', '芋头': '芋头', '南瓜': '南瓜', '黄瓜': '黄瓜',
        '青椒': '青椒', '西兰花': '西兰花', '芦笋': '芦笋',
    }
    for kw, veg_name in veg_map.items():
        if kw in name:
            ingredients.append({'name': veg_name, 'amount': 200, 'unit': 'g', 'category': '蔬菜菌菇'})
            break

    # Always add basic aromatics
    ingredients.append({'name': '姜', 'amount': 10, 'unit': 'g', 'category': '香辛料'})
    ingredients.append({'name': '蒜', 'amount': 10, 'unit': 'g', 'category': '香辛料'})
    ingredients.append({'name': '生抽', 'amount': 15, 'unit': 'ml', 'category': '调味干货'})

    # Detect spice profile
    if '麻辣' in name or '水煮' in name or '毛血旺' in name:
        ingredients.append({'name': '干辣椒', 'amount': 15, 'unit': 'g', 'category': '香辛料'})
        ingredients.append({'name': '花椒', 'amount': 10, 'unit': 'g', 'category': '香辛料'})
    elif '酸' in name:
        ingredients.append({'name': '白醋', 'amount': 20, 'unit': 'ml', 'category': '调味干货'})
    elif '咖喱' in name:
        ingredients.append({'name': '咖喱块', 'amount': 30, 'unit': 'g', 'category': '调味干货'})

    # Category-based fallback protein
    if not detected_protein:
        if any(k in category for k in ['鸡', '禽']):
            ingredients.insert(0, {'name': '鸡肉', 'amount': 400, 'unit': 'g', 'category': '肉禽蛋品'})
        elif any(k in category for k in ['猪', '牛']):
            ingredients.insert(0, {'name': '猪肉', 'amount': 300, 'unit': 'g', 'category': '肉禽蛋品'})
        elif any(k in category for k in ['海鲜', '鱼']):
            ingredients.insert(0, {'name': '鱼', 'amount': 400, 'unit': 'g', 'category': '海鲜水产'})

    return ingredients

# Process all recipes
updated = 0
for recipe in recipes:
    # Skip recipes that already have real ingredients
    if len(recipe.get('ingredients', [])) > 0:
        # Still add collections if missing
        if 'collections' not in recipe:
            recipe['collections'] = []
        continue

    name = recipe['name']
    category = recipe.get('category', '家常菜')

    # Generate ingredients
    recipe['ingredients'] = ingredient_db.get(name, generate_ingredients_from_name(name, category))

    # Fix description
    if recipe.get('description', '').endswith('，家常美味'):
        desc_map = {
            '川菜': f'麻辣鲜香的经典{name}',
            '粤菜': f'清淡鲜美的{name}',
            '湘菜': f'香辣下饭的{name}',
            '甜品': f'香甜可口的{name}',
            '东南亚': f'异域风味的{name}',
        }
        recipe['description'] = desc_map.get(category, f'{name}，简单美味的家常菜')

    # Fix tip
    if recipe.get('tip', '').endswith('的平衡'):
        tip_map = {
            '炒': '大火快炒保持鲜嫩，食材提前腌制更入味',
            '炖': '小火慢炖让食材充分吸收汤汁',
            '烧': '收汁是关键，汤汁浓稠裹住食材才够味',
            '煎': '热锅冷油中小火慢煎，两面金黄即可',
            '蒸': '大火蒸透保持原汁原味',
            '烤': '提前腌制入味，烤箱预热很重要',
            '炸': '油温要够，复炸一次更酥脆',
            '拌': '调味是灵魂，拌匀后腌制片刻更入味',
        }
        method = next((m for m in tip_map if m in name), None)
        recipe['tip'] = tip_map.get(method, f'{name}的关键是食材新鲜和火候掌控')

    # Fix steps
    if recipe.get('steps') == ['准备食材', '处理主料', f'烹饪{name}', '调味出锅']:
        main_ingredient = recipe['ingredients'][0]['name'] if recipe['ingredients'] else '主料'
        recipe['steps'] = [
            f'准备食材：{main_ingredient}处理干净，切配备用',
            f'起锅烧油，烹制{name}',
            f'调味翻炒均匀',
            '出锅装盘即可',
        ]

    # Add collections
    if 'collections' not in recipe:
        recipe['collections'] = []

    # Enhance tags
    existing_tags = set(recipe.get('tags', []))
    tag_rules = {
        '麻辣': ['麻辣', '水煮', '毛血旺'],
        '酸味': ['酸'],
        '酸甜': ['糖醋'],
        '炒': ['炒'],
        '炖': ['炖', '煲'],
        '烤': ['烤'],
        '炸': ['炸'],
        '蒸': ['蒸'],
        '拌': ['拌'],
        '主食': ['面', '粉', '饭'],
        '汤': ['汤'],
        '焖': ['焖'],
        '煎': ['煎'],
    }
    for tag, keywords in tag_rules.items():
        if any(kw in name for kw in keywords):
            existing_tags.add(tag)
    recipe['tags'] = list(existing_tags)[:8]

    updated += 1

# Save
with open('app/data/recipes.json', 'w', encoding='utf-8') as f:
    json.dump(recipes, f, ensure_ascii=False, indent=2)

print(f"Updated {updated} recipes")
print(f"Total: {len(recipes)}")

# Verify samples
for rid in ['r15', 'r20', 'r50']:
    r = next((x for x in recipes if x['id'] == rid), None)
    if r:
        print(f"\n{r['name']} ({r['category']}):")
        print(f"  Ingredients: {[i['name'] for i in r['ingredients']]}")
        print(f"  Tags: {r['tags']}")
        print(f"  Tip: {r['tip']}")
