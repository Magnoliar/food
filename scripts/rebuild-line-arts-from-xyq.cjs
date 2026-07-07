const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const root = process.cwd();
const xyqDir = String.raw`C:\Users\zrhel\Desktop\xyq`;
const lineArtsDir = path.join(root, 'public', 'line-arts');
const mapPath = path.join(root, 'tmp-line-art-sheets', 'xyq-source', 'index-map.csv');
const outDir = path.join(root, 'tmp-line-art-sheets');
const planPath = path.join(outDir, 'xyq-rebuild-plan.csv');
const dbPath = path.join(root, 'dev.db');
const dryRun = process.argv.includes('--dry-run');

const labels = [
  '芦笋', '娃娃菜', '培根', '笋', '笋', '牛肉', '肥牛', '西兰花', '白菜', '小白菜',
  '白菜', '卷心菜', '胡萝卜', '花菜', '板栗仁', '干辣椒', '桂皮', '椰奶', '椰浆', null,
  '五花肉', '油豆腐', '五花肉', '罗氏虾', '虾', '南瓜', '白糖', '鱼', '兔肉', '金针菇',
  '老抽', '冰糖', '柠檬', '排骨', '螺丝椒', '牛肉', '猪小排', '牛奶', null, '干锅酱',
  null, '冰糖', '老抽', '鸭子', '蜂蜜', '猪肉末', '虾', '花椒', '青椒', '老抽',
  '干辣椒', '牛里脊', '虾', '兔肉', '培根', '牛腩', '牛肉', '牛肉', '鸭子', '毛肚',
  '豆腐', '牛奶', '白芝麻', '粉丝', '莴笋', '猪肉', '盐', '虾', '葱', '虾',
  '扇贝肉', '肉肠', '牛奶', '毛肚', '姜', '娃娃菜', '苹果', '白醋', '扇贝肉', '豆腐',
  '生抽', '蒜', '洋葱', '牛腩', '白菜', '番茄酱', '鸡腿', '虾', '黄牛肉', '猪蹄',
  '大米', '冰糖', '老抽', '青柠', '虾', '淡奶油', null, '香菇', '排骨', '黄油',
  '葱', '午餐肉', '猪肉片', '玉米淀粉', '排骨', '三黄鸡', '老抽', '白菜', '虾', '低筋面粉',
  '干锅酱', '冰糖', '兔肉', '白芝麻', '午餐肉', '料酒', '玉米粒', '奶油奶酪', '奶油奶酪', '奶油奶酪',
  '孜然粉', '咖喱块', '咖喱块', '咖喱粉', null, '干豇豆', '干豇豆', '干豇豆', '干豇豆', '四季豆',
  null, '干豇豆', null, '干豇豆', '干豇豆', '二荆条', '二荆条', '蒜苔', '蒜苗', '青豆',
  '豌豆', '手抓饼皮', '河粉', '杏鲍菇', null, '生菜', '低筋面粉', '螺蛳粉', '螺蛳粉', '螺蛳粉',
  '螺蛳粉', '味醂', '料酒', '蘑菇', '芥末酱', '芥末酱', '芥末酱', '芥末酱', '油豆腐', '橄榄油',
  null, '蚝油', '木瓜', '帕玛森芝士', null, '欧芹', '百香果', '面条', '意面', '意面',
  '面条', '紫苏叶', '紫苏叶', '紫苏叶', '紫苏叶', '紫苏叶', '泡椒', '猪腰', '五花肉', '猪肉丝',
  '猪肚', '猪里脊', '土豆', '粘米粉', '米线', '花椒', '八角', '八角', '芋头', '吐司',
  '豆腐', '豆腐', '豆腐', '小米辣', '西米',
];

// Manual fixes from the xyq numbered contact sheet.
labels[59] = '猪肝';
labels[79] = '嫩豆腐';
labels[97] = '口蘑';

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function parseMap() {
  return fs.readFileSync(mapPath, 'utf8')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const comma = line.indexOf(',');
      return {
        index: Number(line.slice(0, comma)),
        name: line.slice(comma + 1),
      };
    });
}

const rows = parseMap();
if (rows.length !== labels.length) {
  throw new Error(`Source map length mismatch: ${rows.length} rows, ${labels.length} labels`);
}

const db = fs.existsSync(dbPath) ? new Database(dbPath) : null;
const ingredientNames = db
  ? new Set(db.prepare('SELECT name FROM Ingredient').all().map((row) => row.name))
  : new Set();

const counts = new Map();
const seenByIngredient = new Map();
const plan = [];

for (let i = 0; i < rows.length; i++) {
  const label = labels[i];
  const src = path.join(xyqDir, rows[i].name);
  if (!fs.existsSync(src)) throw new Error(`Missing xyq source: ${src}`);

  if (!label) {
    plan.push({ ...rows[i], label: '', target: '', action: 'skip' });
    continue;
  }
  if (ingredientNames.size && !ingredientNames.has(label)) {
    throw new Error(`Unknown ingredient label: ${label}`);
  }

  const hash = sha256(src);
  const seen = seenByIngredient.get(label) || new Set();
  if (seen.has(hash)) {
    plan.push({ ...rows[i], label, target: '', action: 'duplicate-skip' });
    continue;
  }
  seen.add(hash);
  seenByIngredient.set(label, seen);

  const next = (counts.get(label) || 0) + 1;
  counts.set(label, next);
  const target = `${label}_${next}.jpg`;
  plan.push({ ...rows[i], label, target, action: 'copy' });
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  planPath,
  [
    'Index,Source,MatchedIngredient,Target,Action',
    ...plan.map((p) => `${String(p.index).padStart(3, '0')},${p.name},${p.label},${p.target},${p.action}`),
  ].join('\n'),
  'utf8',
);

console.log(`Wrote plan: ${planPath}`);
console.log(`Will copy ${plan.filter((p) => p.action === 'copy').length} images`);
console.log(`Will skip ${plan.filter((p) => p.action !== 'copy').length} duplicate/unmatched images`);

if (dryRun) {
  for (const row of plan.filter((p) => p.action === 'copy').slice(0, 16)) {
    console.log(`[DRY] ${row.name} -> ${row.target}`);
  }
  db?.close();
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(outDir, `line-arts-before-xyq-rebuild-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });

for (const file of fs.readdirSync(lineArtsDir).filter((file) => file.endsWith('.jpg'))) {
  fs.copyFileSync(path.join(lineArtsDir, file), path.join(backupDir, file));
  fs.unlinkSync(path.join(lineArtsDir, file));
}

for (const row of plan.filter((p) => p.action === 'copy')) {
  fs.copyFileSync(path.join(xyqDir, row.name), path.join(lineArtsDir, row.target));
}

console.log(`Backed up previous jpg files to: ${backupDir}`);
console.log(`Rebuilt ${plan.filter((p) => p.action === 'copy').length} jpg files in line-arts`);

if (db) {
  const ingredients = db.prepare('SELECT id, name FROM Ingredient ORDER BY name').all();
  const files = fs.readdirSync(lineArtsDir)
    .filter((file) => file.endsWith('.jpg'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
  const grouped = new Map();

  for (const file of files) {
    const name = file.replace(/_[0-9]+\.jpg$/, '');
    if (!ingredientNames.has(name)) continue;
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push(`/line-arts/${file}`);
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

  const history = ingredients
    .map((ing) => ({
      ingredientName: ing.name,
      ingredientId: ing.id,
      imageUrls: grouped.get(ing.name) || [],
      timestamp: new Date().toISOString(),
    }))
    .filter((entry) => entry.imageUrls.length);

  fs.writeFileSync(
    path.join(root, 'server', 'data', 'line-art-history.json'),
    JSON.stringify(history, null, 2),
    'utf8',
  );

  console.log(`Updated dev.db and line-art history for ${history.length} ingredients`);
}
