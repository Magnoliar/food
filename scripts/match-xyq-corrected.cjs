/**
 * CORRECTED match-xyq-images.js
 * Based on visual identification of ALL XYQ images.
 *
 * The original IMAGE_MAP was completely wrong - every file was mapped
 * to the wrong ingredient. This script fixes all mappings.
 *
 * Usage: node scripts/match-xyq-corrected.js [--dry-run]
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const XYQ_DIR = String.raw`C:\Users\zrhel\Desktop\xyq`;
const LINE_ARTS_DIR = String.raw`C:\Users\zrhel\Documents\food\public\line-arts`;
const DB_PATH = String.raw`C:\Users\zrhel\Documents\food\dev.db`;

const DRY_RUN = process.argv.includes('--dry-run');

// ─── CORRECTED Mapping: filename → ingredient name ───
// Based on visual identification of all colored_pencil.png files.
const CORRECTED_MAP = {
  // ── 干锅酱 (dry pot sauce) ──
  'colored_pencil.png_1768604095244.jpeg': '干锅酱',
  'colored_pencil.png_1768951784460.jpeg': '干锅酱',

  // ── 老抽 (dark soy sauce) ──
  'colored_pencil.png_1768609877260.jpeg': '老抽',
  'colored_pencil.png_1768609947404.jpeg': '老抽',

  // ── 生抽 (light soy sauce) ──
  'colored_pencil.png_1768635187212.jpeg': '生抽',
  'colored_pencil.png_1768775884300.jpeg': '生抽',

  // ── 牛奶 (milk) ──
  'colored_pencil.png_1768604090892.jpeg': '牛奶',
  'colored_pencil.png_1768833819148.jpeg': '牛奶',

  // ── 苹果 (apple) ──
  'colored_pencil.png_1768546899724.jpeg': '苹果',
  'colored_pencil.png_1768783183884.jpeg': '苹果',

  // ── 柠檬 (lemon) ──
  'colored_pencil.png_1768715241484.jpeg': '柠檬',
  'colored_pencil.png_1768830821644.jpeg': '柠檬',
  'colored_pencil.png_1768863789836.jpeg': '柠檬',
  'colored_pencil.png_1768718041100.jpeg': '柠檬',

  // ── 青柠 (lime) ──
  'colored_pencil.png_1768839040524.jpeg': '青柠',

  // ── 糖 (sugar) ──
  'colored_pencil.png_1768451618572.jpeg': '糖',

  // ── 洋葱 (onion) ──
  'colored_pencil.png_1768863781132.jpeg': '洋葱',

  // ── 鸡蛋 (egg) ──
  'colored_pencil.png_1768540982028.jpeg': '鸡蛋',
  'colored_pencil.png_1768479475724.jpeg': '鸡蛋',

  // ── 青椒 (green pepper) ──
  'colored_pencil.png_1768766763276.jpeg': '青椒',
  'colored_pencil.png_1768833815820.jpeg': '青椒',

  // ── 番茄 (tomato) ──
  'colored_pencil.png_1768768209420.jpeg': '番茄',

  // ── 葱 (green onion) ──
  'colored_pencil.png_1768768178444.jpeg': '葱',
  'colored_pencil.png_1768842432012.jpeg': '葱',

  // ── 蜂蜜 (honey) ──
  'colored_pencil.png_1768541038604.jpeg': '蜂蜜',
  'colored_pencil.png_1768927300108.jpeg': '蜂蜜',

  // ── 肥牛 (fatty beef) ──
  'colored_pencil.png_1768435158284.jpeg': '肥牛',

  // ── 扇贝肉 (scallop) ──
  'colored_pencil.png_1768935681036.jpeg': '扇贝肉',

  // ── 排骨 (pork ribs) ──
  'colored_pencil.png_1768720982540.jpeg': '排骨',
  'colored_pencil.png_1768778656524.jpeg': '排骨',
  'colored_pencil.png_1768935669516.jpeg': '排骨',
  'colored_pencil.png_1768960537100.jpeg': '排骨',
  'colored_pencil.png_1770878129932.jpeg': '排骨',

  // ── 鱼 (fish) ──
  'colored_pencil.png_1768451632140.jpeg': '鱼',
  'colored_pencil.png_1768848467468.jpeg': '鱼',
  'colored_pencil.png_1768951707148.jpeg': '鱼',

  // ── 虾 (shrimp) ──
  'colored_pencil.png_1768621995276.jpeg': '虾',
  'colored_pencil.png_1768705857292.jpeg': '虾',
  'colored_pencil.png_1768863789068.jpeg': '虾',

  // ── 干辣椒 (dried chili) ──
  'colored_pencil.png_1768331315724.jpeg': '干辣椒',

  // ── 姜 (ginger) ──
  'colored_pencil.png_1768540973324.jpeg': '姜',

  // ── 蘑菇 (mushroom) ──
  'colored_pencil.png_1768538022156.jpeg': '蘑菇',
  'colored_pencil.png_1768932669708.jpeg': '蘑菇',

  // ── 三黄鸡 (whole chicken) ──
  'colored_pencil.png_1768539456780.jpeg': '三黄鸡',
  'colored_pencil.png_1768541023500.jpeg': '三黄鸡',

  // ── 鸡腿 (chicken leg) ──
  'colored_pencil.png_1768681931788.jpeg': '鸡腿',
  'colored_pencil.png_1768715315212.jpeg': '鸡腿',
  'colored_pencil.png_1768936911372.jpeg': '鸡腿',
  'colored_pencil.png_1771052897292.jpeg': '鸡腿',

  // ── 猪肉片 (sliced pork) ──
  'colored_pencil.png_1768783160332.jpeg': '猪肉片',

  // ── 羊肉 (lamb) ──
  'colored_pencil.png_1768717984780.jpeg': '羊肉',
  'colored_pencil.png_1768842413580.jpeg': '羊肉',

  // ── 牛肉 (beef) ──
  'colored_pencil.png_1768845595916.jpeg': '牛肉',

  // ── 花椒 (Sichuan peppercorn) ──
  'colored_pencil.png_1768673108492.jpeg': '花椒',

  // ── 白醋 (white vinegar) ──
  'colored_pencil.png_1768778639884.jpeg': '白醋',

  // ── 鸭子 (duck) ──
  'colored_pencil.png_1768717087244.jpeg': '鸭子',
  'colored_pencil.png_1768833839884.jpeg': '鸭子',

  // ── 酸汤底料 (sour soup base) ──
  'colored_pencil.png_1768839084556.jpeg': '酸汤底料',

  // ── 泡菜 (pickled vegetables) ──
  'colored_pencil.png_1768715594764.jpeg': '泡菜',

  // ── (1) duplicate files ──
  'colored_pencil.png_1768604090892 (1).jpeg': '牛奶',
  'colored_pencil.png_1768604095244 (1).jpeg': '虾',
  'colored_pencil.png_1768715315212 (1).jpeg': '干锅酱',
  'colored_pencil.png_1768927300108 (1).jpeg': '虾',
  'cooking_wine_c.png_1768799590668.jpeg': '香油',
};

// ─── Main ───
function main() {
  const db = new Database(DB_PATH);

  // Get all ingredients
  const ingredients = db.prepare(
    'SELECT id, name, line_art_url FROM Ingredient ORDER BY name'
  ).all();

  const ingredientMap = {};
  for (const ing of ingredients) {
    let urls = [];
    if (ing.line_art_url) {
      try { urls = JSON.parse(ing.line_art_url); } catch (e) { urls = []; }
    }
    ingredientMap[ing.name] = { id: ing.id, urls };
  }

  // Group files by ingredient
  const matchesByIngredient = {};
  for (const [filename, ingredientName] of Object.entries(CORRECTED_MAP)) {
    if (!matchesByIngredient[ingredientName]) {
      matchesByIngredient[ingredientName] = [];
    }
    matchesByIngredient[ingredientName].push(filename);
  }

  // Sort files within each group by timestamp
  for (const name of Object.keys(matchesByIngredient)) {
    matchesByIngredient[name].sort();
  }

  let totalCopied = 0;
  let totalUpdated = 0;
  const results = [];

  for (const [ingredientName, files] of Object.entries(matchesByIngredient)) {
    const ing = ingredientMap[ingredientName];
    if (!ing) {
      console.log(`WARN: "${ingredientName}" not in DB, skipping ${files.length} file(s)`);
      continue;
    }

    const existingCount = ing.urls.length;
    let nextNum = existingCount + 1;
    const newUrls = [];

    for (const filename of files) {
      const srcPath = path.join(XYQ_DIR, filename);
      const destName = `${ingredientName}_${nextNum}.jpg`;
      const destPath = path.join(LINE_ARTS_DIR, destName);
      const urlPath = `/line-arts/${destName}`;

      if (!fs.existsSync(srcPath)) {
        console.log(`  SKIP (not found): ${filename}`);
        continue;
      }

      // Check if this URL already exists in DB
      if (ing.urls.includes(urlPath)) {
        console.log(`  SKIP (already in DB): ${urlPath}`);
        nextNum++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  [DRY] ${filename} -> ${destName}`);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
      newUrls.push(urlPath);
      nextNum++;
      totalCopied++;
    }

    if (newUrls.length > 0) {
      const allUrls = [...ing.urls, ...newUrls];
      const urlJson = JSON.stringify(allUrls);

      if (!DRY_RUN) {
        db.prepare('UPDATE Ingredient SET line_art_url = ? WHERE id = ?')
          .run(urlJson, ing.id);
      }
      results.push(`  ${ingredientName}: ${existingCount} -> ${allUrls.length} images (+${newUrls.length})`);
      totalUpdated++;
    }
  }

  // Print results
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
  console.log('='.repeat(50));
  results.forEach(r => console.log(r));

  console.log(`\nTotal files copied: ${totalCopied}`);
  console.log(`Ingredients updated: ${totalUpdated}`);

  // Show remaining unmatched
  const matchedNames = new Set(Object.keys(matchesByIngredient));
  const stillUnmatched = ingredients.filter(ing => {
    if (ing.line_art_url) return false;
    return !matchedNames.has(ing.name);
  });
  if (stillUnmatched.length > 0) {
    console.log(`\nStill no line art (${stillUnmatched.length}):`);
    stillUnmatched.forEach(ing => console.log(`  - ${ing.name}`));
  }

  db.close();
}

main();
