export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 400, message: '食材名称不能为空' })

  let expiryDate: Date | null = null
  if (body.expiryDate) {
    const parsed = new Date(body.expiryDate)
    if (isNaN(parsed.getTime())) throw createError({ statusCode: 400, message: '保质期日期格式不正确' })
    expiryDate = parsed
  }

  const VALID_ZONES = ['refrigerated', 'frozen', 'room_temp']
  const zone = VALID_ZONES.includes(body.zone) ? body.zone : 'refrigerated'

  const item = await prisma.fridgeItem.create({
    data: {
      name: body.name,
      amount: body.amount || '',
      zone,
      expiryDate,
    },
  })
  return item
})
