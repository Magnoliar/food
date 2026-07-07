export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { recipeName, selfScore, partnerScore, selfComment, partnerComment } = body

  if (!recipeName) {
    throw createError({ statusCode: 400, message: '需要菜名' })
  }

  const scoreInfo = [
    selfScore ? `猪猪评分 ${selfScore}/10` : '',
    partnerScore ? `猪宝评分 ${partnerScore}/10` : '',
    selfComment ? `猪猪说：${selfComment}` : '',
    partnerComment ? `猪宝说：${partnerComment}` : '',
  ].filter(Boolean).join('；')

  const system = `你是一个温馨的家庭厨房助手。用户刚做完一道菜，根据评分和评语写一段简短的复盘（50字以内）。
语气轻松自然，像在日记本上随手写的。可以提到改进方向或做得好的地方。
只返回复盘文字，不要其他内容。`

  try {
    const result = await aiChat([{ role: 'user', content: `刚做了${recipeName}。${scoreInfo || '还没评过分。'}` }], {
      system,
      light: true,
    })
    return { draft: result.trim() }
  } catch {
    return { draft: '' }
  }
})
