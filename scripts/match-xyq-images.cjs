/**
 * Match XYQ generic-named images to database ingredients.
 * Based on visual identification of each image file.
 *
 * Usage: node scripts/match-xyq-images.js [--dry-run]
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const XYQ_DIR = 'C:\\Users\\zrhel\\Desktop\\xyq';
const LINE_ARTS_DIR = 'C:\\Users\\zrhel\\Documents\\food\\public\\line-arts';
const DB_PATH = 'C:\\Users\\zrhel\\Documents\\food\\dev.db';

const DRY_RUN = process.argv.includes('--dry-run');

// ─── Mapping: filename → ingredient name ───
// Each file is mapped to EXACTLY ONE ingredient (deduplicated).
// Based on visual identification of all 120+ generic-named XYQ images.
const IMAGE_MAP = {
  // ── 罗氏虾 (giant freshwater prawn, Macrobrachium rosenbergii) ──
  'colored_pencil.png_1768331315724.jpeg': '罗氏虾',
  'colored_pencil.png_1768435155212.jpeg': '罗氏虾',

  // ── 虾 (prawn/shrimp) ──
  'colored_pencil.png_1768435158284.jpeg': '虾',
  'colored_pencil.png_1768539456780.jpeg': '虾',
  'colored_pencil.png_1768540973324.jpeg': '虾',
  'colored_pencil.png_1768681931788.jpeg': '虾',
  'colored_pencil.png_1768768178444.jpeg': '虾',
  'colored_pencil.png_1768833785612.jpeg': '虾',
  'colored_pencil.png_1768932669708.jpeg': '虾',

  // ── 虾仁 (peeled shrimp / shrimp meat) ──
  'colored_pencil.png_1768451618572.jpeg': '虾仁',
  'colored_pencil.png_1768451632140.jpeg': '虾仁',
  'colored_pencil.png_1768538022156.jpeg': '虾仁',
  'colored_pencil.png_1768546899724.jpeg': '虾仁',
  'colored_pencil.png_1768766689036.jpeg': '虾仁',
  'colored_pencil.png_1768768209420.jpeg': '虾仁',
  'colored_pencil.png_1768830848268.jpeg': '虾仁',
  'colored_pencil.png_1768857658124.jpeg': '虾仁',
  'colored_pencil.png_1768863781132.jpeg': '虾仁',
  'colored_pencil.png_1768960554508.jpeg': '虾仁',
  'ximi_color_pen.png_1768842434316.jpeg': '虾仁',

  // ── 鲫鱼 (crucian carp) ──
  'colored_pencil.png_1768436545548.jpeg': '鲫鱼',
  'colored_pencil.png_1768479475724.jpeg': '鲫鱼',
  'colored_pencil.png_1768540982028.jpeg': '鲫鱼',
  'colored_pencil.png_1768839084556.jpeg': '鲫鱼',

  // ── 鱼 (generic fish - grass carp / silver carp) ──
  'colored_pencil.png_1768766710028.jpeg': '鱼',
  'colored_pencil.png_1768778639884.jpeg': '鱼',
  'colored_pencil.png_1768833815820.jpeg': '鱼',
  'colored_pencil.png_1768848467468.jpeg': '鱼',
  'colored_pencil.png_1768951707148.jpeg': '鱼',
  'colored_pencil.png_1770969039116.jpeg': '鱼',

  // ── 排骨 (pork ribs / spareribs) ──
  'colored_pencil.png_1768541023500.jpeg': '排骨',
  'colored_pencil.png_1768621995276.jpeg': '排骨',
  'colored_pencil.png_1768720982540.jpeg': '排骨',
  'colored_pencil.png_1768775884300.jpeg': '排骨',
  'colored_pencil.png_1768778656524.jpeg': '排骨',
  'colored_pencil.png_1768783160332.jpeg': '排骨',
  'colored_pencil.png_1768842432012.jpeg': '排骨',
  'colored_pencil.png_1768863789068.jpeg': '排骨',
  'colored_pencil.png_1768935681036.jpeg': '排骨',
  'colored_pencil.png_1768953166860.jpeg': '排骨',
  'colored_pencil.png_1768960537100.jpeg': '排骨',
  'colored_pencil.png_1770878129932.jpeg': '排骨',

  // ── 鸡腿 (chicken leg/thigh) ──
  'colored_pencil.png_1768541038604.jpeg': '鸡腿',
  'colored_pencil.png_1768715241484.jpeg': '鸡腿',
  'colored_pencil.png_1768715315212.jpeg': '鸡腿',
  'colored_pencil.png_1768830821644.jpeg': '鸡腿',
  'colored_pencil.png_1768863789836.jpeg': '鸡腿',
  'colored_pencil.png_1768936911372.jpeg': '鸡腿',
  'colored_pencil.png_1771052897292.jpeg': '鸡腿',

  // ── 鸡肉 (chicken wings mapped to 鸡肉, as 鸡翅 not in DB) ──
  'colored_pencil.png_1768715204620.jpeg': '鸡肉',
  'colored_pencil.png_1768775924236.jpeg': '鸡肉',
  'colored_pencil.png_1768839040524.jpeg': '鸡肉',

  // ── 鸭子 (duck) ──
  'colored_pencil.png_1768542338316.jpeg': '鸭子',
  'colored_pencil.png_1768718041100.jpeg': '鸭子',
  'colored_pencil.png_1768833839884.jpeg': '鸭子',

  // ── 牛肉 (beef) ──
  'colored_pencil.png_1768604090892.jpeg': '牛肉',
  'colored_pencil.png_1768604095244.jpeg': '牛肉',
  'colored_pencil.png_1768705857292.jpeg': '牛肉',
  'colored_pencil.png_1768715594764.jpeg': '牛肉',
  'colored_pencil.png_1768833819148.jpeg': '牛肉',
  'colored_pencil.png_1768951784460.jpeg': '牛肉',

  // ── 牛腩 (beef brisket / chuck) ──
  'colored_pencil.png_1768783074060.jpeg': '牛腩',
  'colored_pencil.png_1768783183884.jpeg': '牛腩',
  'colored_pencil.png_1768799576076.jpeg': '牛腩',
  'colored_pencil.png_1768842413580.jpeg': '牛腩',
  'colored_pencil.png_1768857832204.jpeg': '牛腩',
  'colored_pencil.png_1768935669516.jpeg': '牛腩',
  'colored_pencil.png_1770988480012.jpeg': '牛腩',

  // ── 牛里脊 (beef tenderloin) ──
  'colored_pencil.png_1768718019340.jpeg': '牛里脊',
  'colored_pencil.png_1768927300108.jpeg': '牛里脊',
  'colored_pencil.png_1768953014284.jpeg': '牛里脊',

  // ── 猪肉 (pork) ──
  'colored_pencil.png_1768609846796.jpeg': '猪肉',
  'colored_pencil.png_1768609877260.jpeg': '猪肉',
  'colored_pencil.png_1768609947404.jpeg': '猪肉',
  'colored_pencil.png_1768673110796.jpeg': '猪肉',
  'colored_pencil.png_1768715188748.jpeg': '猪肉',
  'colored_pencil.png_1768958992396.jpeg': '猪肉',

  // ── 猪肉片 (sliced pork) ──
  'colored_pencil.png_1768680526860.jpeg': '猪肉片',
  'colored_pencil.png_1768717087244.jpeg': '猪肉片',
  'colored_pencil.png_1768766763276.jpeg': '猪肉片',
  'colored_pencil.png_1768845595916.jpeg': '猪肉片',

  // ── 猪肉末 (ground pork) ──
  'colored_pencil.png_1768635187212.jpeg': '猪肉末',
  'colored_pencil.png_1768717984780.jpeg': '猪肉末',
  'colored_pencil.png_1770642361868.jpeg': '猪肉末',

  // ── 黄牛肉 (Huang breed beef) ──
  'colored_pencil.png_1768697830412.jpeg': '黄牛肉',
  'colored_pencil.png_1768936896268.jpeg': '黄牛肉',
  'colored_pencil.png_1771051910156.jpeg': '黄牛肉',

  // ── 油豆腐 (fried tofu puff) ──
  'colored_pencil.png_1768665568524.jpeg': '油豆腐',

  // ── 毛肚 (beef tripe) ──
  'colored_pencil.png_1768716979724.jpeg': '毛肚',

  // ── 蟹 (crab) ──
  'color_pencil_b.png_1768842329356.jpeg': '蟹',

  // ── 豆豉 (fermented black beans / doubanjiang) ──
  'color_pencil_d.png_1768665521676.jpeg': '豆豉',

  // ── 面条 (noodles - includes fried gluten ball, dry noodles, pasta) ──
  'hand_grabbed_p.png_1768537991436.jpeg': '面条',
  'pencil_pasta_1.png_1768621942028.jpeg': '面条',
  'pencil_pasta_2.png_1768697849100.jpeg': '面条',
  'pencil_pasta_3.png_1768716971276.jpeg': '面条',
  'pencil_pasta_4.png_1768841182988.jpeg': '面条',

  // ── 韩式蘸酱 (Korean dipping sauce) ──
  'dachshund_colo.png_1768774211084.jpeg': '韩式蘸酱',

  // ── 小米辣 (bird's eye chili) ──
  'xiaomi_chili_c.png_1768927253772.jpeg': '小米辣',

  // ── 淡奶油 (whipping cream) ──
  'cream_colored_.png_1768842341900.jpeg': '淡奶油',

  // ── 蒜苔 (garlic sprout / scape) ──
  'garlic_sprout_.png_1768842392588.jpeg': '蒜苔',
  'garlic_sprout_.png_1768927330828.jpeg': '蒜苔',

  // ── 河粉 (hefen / rice noodle sheets) ──
  'hefen_colored_.png_1768839093004.jpeg': '河粉',
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
  for (const [filename, ingredientName] of Object.entries(IMAGE_MAP)) {
    if (!matchesByIngredient[ingredientName]) {
      matchesByIngredient[ingredientName] = [];
    }
    matchesByIngredient[ingredientName].push(filename);
  }

  // Sort files within each group by timestamp (natural sort of filename)
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
    if (ing.line_art_url) return false; // already had images
    return !matchedNames.has(ing.name);
  });
  if (stillUnmatched.length > 0) {
    console.log(`\nStill unmatched ingredients (${stillUnmatched.length}):`);
    stillUnmatched.forEach(ing => console.log(`  - ${ing.name}`));
  }

  db.close();
}

main();
