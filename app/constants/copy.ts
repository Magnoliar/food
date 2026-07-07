export const emptyStates = {
  cookLogs: [
    '还没有下厨记录呢，今晚试试？',
    '厨房日志还是空白的，等你来写第一笔。',
    '做一道菜后点"快速记录"就好啦。',
  ],
  journey: [
    '还没有烹饪记录，等你开灶那天就开始了。',
  ],
  poster: [
    '还没有可以生成打卡的菜谱，先做一道吧。',
  ],
  ingredients: [
    '食材库空空如也，先添几样常用的吧。',
  ],
  noMatch: {
    ingredients: ['没有找到匹配的食材，换个词试试？'],
    recipes: ['没找到匹配的菜谱。'],
  },
  fridge: {
    refrigerated: ['冷藏室空空的，该去采购了。'],
    frozen: ['冷冻区暂时是空的。'],
    roomTemp: ['常温区还没有东西。'],
  },
  noRelatedRecipes: ['这个食材还没出现在任何菜谱里。'],
  recipeNotFound: ['这道菜谱可能被删掉了。'],
  ingredientNotFound: ['这个食材可能被移除了。'],
  noSteps: ['这道菜还没有写步骤。'],
  shoppingList: ['还没有清单，计划好菜谱后来生成一份。'],
}

export const loadingMessages = {
  general: ['加载中...'],
  home: ['正在看看今天厨房里有什么...'],
  cookMode: ['正在打开这道菜...'],
  poster: ['正在准备打卡卡片...'],
  graph: ['正在画食材图谱...'],
  achievements: ['正在翻成就册...'],
  journey: ['正在回顾美食足迹...'],
  cookLogs: ['正在翻烹饪日志...'],
  ingredients: ['正在盘点食材...'],
}

export const statusMessages = {
  saved: ['已保存。', '存好了。'],
  planSaved: ['计划存好了。', '已保存，清单也同步了。'],
  listUpdated: ['清单已同步。', '购物清单同步好了。'],
  aiFilled: ['已经补好空位了。', '空位都填上了。'],
  planFull: ['这周已经排满了，不需要补。'],
  uploadFail: ['照片上传失败，换一张小于 5MB 的 jpg、png 或 webp 试试。'],
  aiFail: ['AI 生成失败了，先手动填一下？'],
  aiUnavailable: ['AI 暂时不可用，先手动填吧。'],
  saveFail: ['保存失败了，稍后再试一次。'],
  posterDataFail: ['打卡数据暂时没有加载成功，稍后再试一次。'],
}
