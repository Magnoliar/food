const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = process.cwd();
const lineArtsDir = path.join(root, 'public', 'line-arts');
const mapPath = path.join(root, 'tmp-line-art-sheets', 'index-map.csv');
const planPath = path.join(root, 'tmp-line-art-sheets', 'rename-plan.csv');
const dbPath = path.join(root, 'dev.db');
const dryRun = process.argv.includes('--dry-run');

const labels = `
八角
八角
八角
白菜
牛肉
白醋
白醋
虾
苹果
百香果
板栗仁
冰糖
午餐肉
葱
虾
葱
虾
虾
大米
奶油奶酪
排骨
低筋面粉
河粉
低筋面粉
玉米粒
油豆腐
豆腐
豆腐
豆腐
二荆条
二荆条
二荆条
虾
虾
肥牛
虾
虾
螺丝椒
淡奶油
螺丝椒
淡奶油
橄榄油
橄榄油
干锅酱
干锅酱
淀粉
干锅酱
牛肉
玉米淀粉
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
干豇豆
四季豆
干辣椒
干辣椒
干辣椒
干辣椒
五花肉
五花肉
桂皮
未匹配_狗
蚝油
河粉
胡萝卜
花菜
羊肉
花椒
花椒
花椒
白芝麻
黄牛肉
葱
大米
鸭子
葱
五花肉
兔肉
柠檬
兔肉
柠檬
培根
腊肠
娃娃菜
螺丝椒
午餐肉
午餐肉
干辣椒
牛肉
午餐肉
午餐肉
牛肉
牛肉
扇贝肉
虾
午餐肉
午餐肉
干辣椒
牛肉
南瓜
兔肉
柠檬
番茄酱
姜
冰糖
冰糖
芥末酱
芥末酱
芥末酱
芥末酱
小白菜
白菜
白菜
咖喱粉
咖喱粉
咖喱块
咖喱块
咖喱块
口蘑
姜
干辣椒
黄油
老抽
老抽
鸭子
老抽
鸭子
料酒
芦笋
五花肉
罗氏虾
螺蛳粉
螺蛳粉
螺蛳粉
螺蛳粉
毛肚
米线
手抓饼皮
意面
意面
意面
意面
蘑菇
金针菇
蘑菇
金针菇
蘑菇
木瓜
奶油奶酪
嫩豆腐
奶油奶酪
奶油奶酪
南瓜
豆腐
豆腐
豆腐
豆腐
牛肉
粉丝
扇贝肉
虾
牛肉
粉丝
扇贝肉
虾
白芝麻
淡奶油
排骨
娃娃菜
牛奶
牛奶
洋葱
牛奶
牛奶
洋葱
姜
苹果
白醋
羊肉
冰糖
排骨
兔肉
牛肉
牛奶
干锅酱
虾
鸭子
洋葱
盐
黄牛肉
黄牛肉
欧芹
帕玛森芝士
帕玛森芝士
帕玛森芝士
排骨
鸡肉
白菜
干锅酱
莴笋
毛肚
排骨
白菜
干锅酱
莴笋
毛肚
蜂蜜
排骨
白菜
干锅酱
莴笋
扇贝肉
毛肚
娃娃菜
虾
青柠
黄油
鸭子
鸭子
青椒
培根
培根
排骨
苹果
排骨
苹果
虾
蒜
虾
蒜
淡奶油
娃娃菜
娃娃菜
鸡肉
老抽
排骨
老抽
排骨
白醋
黄油
黄油
生菜
培根
猪肉末
扇贝肉
猪肉末
扇贝肉
手抓饼皮
豌豆
豌豆
豌豆
番茄酱
番茄酱
蒜苔
蒜苗
蒜苔
蒜苗
笋
笋
糖
糖
土豆
吐司
吐司
兔肉
娃娃菜
娃娃菜
冰糖
料酒
味醂
料酒
五花肉
五花肉
午餐肉
西兰花
西米
虾
青柠
干锅酱
蜂蜜
虾
青柠
淡奶油
老抽
冰糖
干辣椒
葱
生抽
蘑菇
蜂蜜
虾
糖
虾
西米
鲫鱼
金针菇
排骨
牛肉
虾
豆腐
白芝麻
老抽
料酒
卷心菜
白菜
白菜
小白菜
小米辣
小米辣
小米辣
五花肉
杏鲍菇
杏鲍菇
牛肉
粉丝
排骨
豆腐
排骨
豆腐
排骨
牛奶
羊肉
牛奶
羊肉
蒜
老抽
老抽
椰奶
椰奶
椰浆
意面
油豆腐
虾
盐
鲫鱼
猪蹄
牛肉
白醋
蒜
猪蹄
牛肉
冰糖
鲫鱼
猪蹄
牛肉
玉米粒
芋头
中筋面粉
玉米淀粉
猪肚
猪里脊
冰糖
老抽
鸭子
青椒
兔肉
老抽
猪肉末
牛奶
低筋面粉
老抽
豆腐
虾
黄牛肉
白菜
白菜
猪肉丝
黄牛肉
番茄酱
猪腰
孜然粉
孜然粉
紫苏叶
紫苏叶
紫苏叶
紫苏叶
紫苏叶
`.trim().split(/\r?\n/);

const rows = fs.readFileSync(mapPath, 'utf8').trim().split(/\r?\n/).slice(1).map((line) => {
  const index = Number(line.slice(0, 3));
  const name = line.slice(4);
  return { index, name };
});

if (rows.length !== labels.length) {
  throw new Error(`Mapping length mismatch: ${rows.length} files, ${labels.length} labels`);
}

const counts = new Map();
const plan = rows.map((row, i) => {
  const label = labels[i];
  const next = (counts.get(label) || 0) + 1;
  counts.set(label, next);
  const target = `${label}_${next}.jpg`;
  return { ...row, label, target };
});

const duplicateTargets = plan
  .map((p) => p.target)
  .filter((target, index, all) => all.indexOf(target) !== index);

if (duplicateTargets.length) {
  throw new Error(`Duplicate target names: ${[...new Set(duplicateTargets)].join(', ')}`);
}

const csv = [
  'Index,Original,MatchedIngredient,Target',
  ...plan.map((p) => `${String(p.index).padStart(3, '0')},${p.name},${p.label},${p.target}`),
].join('\n');
fs.writeFileSync(planPath, csv, 'utf8');

console.log(`Wrote plan: ${planPath}`);

if (dryRun) {
  for (const p of plan.slice(0, 12)) {
    console.log(`[DRY] ${p.name} -> ${p.target}`);
  }
  console.log(`[DRY] ${plan.length} jpg files would be renamed`);
  process.exit(0);
}

const tempSuffix = `.rematch-${Date.now()}.tmp`;
for (const p of plan) {
  const src = path.join(lineArtsDir, p.name);
  const tmp = path.join(lineArtsDir, `${p.name}${tempSuffix}`);
  if (!fs.existsSync(src)) throw new Error(`Missing source: ${src}`);
  fs.renameSync(src, tmp);
  p.tmp = tmp;
}

for (const p of plan) {
  const dest = path.join(lineArtsDir, p.target);
  if (fs.existsSync(dest)) throw new Error(`Target unexpectedly exists: ${dest}`);
  fs.renameSync(p.tmp, dest);
}

console.log(`Renamed ${plan.length} jpg files`);

if (fs.existsSync(dbPath)) {
  const db = new Database(dbPath);
  const ingredients = db.prepare('SELECT id, name FROM Ingredient ORDER BY name').all();
  const ingredientNames = new Set(ingredients.map((ing) => ing.name));
  const grouped = new Map();

  for (const file of fs.readdirSync(lineArtsDir).filter((f) => f.endsWith('.jpg')).sort()) {
    const ingredient = file.replace(/_[0-9]+\.jpg$/, '');
    if (!ingredientNames.has(ingredient)) continue;
    if (!grouped.has(ingredient)) grouped.set(ingredient, []);
    grouped.get(ingredient).push(`/line-arts/${file}`);
  }

  const update = db.prepare('UPDATE Ingredient SET line_art_url = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const ing of ingredients) {
      const urls = grouped.get(ing.name) || [];
      update.run(urls.length ? JSON.stringify(urls) : null, ing.id);
    }
  });
  tx();
  db.close();
  console.log(`Updated dev.db line_art_url for ${grouped.size} ingredients`);

  const history = ingredients.map((ing) => ({
    ingredientName: ing.name,
    ingredientId: ing.id,
    imageUrls: grouped.get(ing.name) || [],
    timestamp: new Date().toISOString(),
  })).filter((entry) => entry.imageUrls.length);
  fs.writeFileSync(
    path.join(root, 'server', 'data', 'line-art-history.json'),
    JSON.stringify(history, null, 2),
    'utf8',
  );
  console.log(`Updated server/data/line-art-history.json with ${history.length} entries`);
}
