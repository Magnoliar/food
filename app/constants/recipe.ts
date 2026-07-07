// Shared recipe constants used across components

export const colorClasses: Record<string, string> = {
  coral: 'bg-crayon-coral/10',
  teal: 'bg-crayon-teal/10',
  sand: 'bg-crayon-sand/10',
  grass: 'bg-crayon-grass/10',
  lavender: 'bg-crayon-lavender/10',
  sky: 'bg-crayon-sky/10',
  lemon: 'bg-crayon-lemon/10',
  gold: 'bg-morandi-gold/10',
}

export const iconMap: Record<string, string> = {
  '川菜': '🌶️',
  '粤菜': '🥘',
  '湘菜': '🔥',
  '家常菜': '🏠',
  '甜品': '🍰',
  '东南亚': '🍜',
  '主食': '🍚',
  '凉菜': '🥗',
}

export const statusLabels: Record<string, { text: string; class: string }> = {
  made: { text: '做过', class: 'bg-morandi-green/15 text-morandi-green' },
  can_make: { text: '会做', class: 'bg-crayon-sky/15 text-crayon-sky' },
  want_to_make: { text: '想做', class: 'bg-crayon-lavender/15 text-crayon-lavender' },
}

export const difficultyLabel = (d: number) => {
  const labels = ['', '新手', '简单', '中等', '较难', '大厨']
  return (d >= 1 && d <= 5) ? labels[d] : '未知'
}

// Map tags/categories to line-art SVG names
export const tagToLineArt: Record<string, string> = {
  '川菜': 'chili',
  '湘菜': 'chili',
  '辣': 'chili',
  '辣椒': 'chili',
  '番茄': 'tomato',
  '南瓜': 'pumpkin',
  '蒜': 'garlic',
  '洋葱': 'onion',
  '鱼': 'fish',
  '鲫鱼': 'fish',
  '肉': 'meat',
  '牛肉': 'meat',
  '猪肉': 'meat',
  '鸡肉': 'meat',
  '茄子': 'eggplant',
}
