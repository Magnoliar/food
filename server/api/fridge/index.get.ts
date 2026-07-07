export default defineEventHandler(async () => {
  const items = await prisma.fridgeItem.findMany()
  // 按过期紧急度排序：即将过期的排前面，无保质期的排后面
  const sortByExpiry = (a: any, b: any) => {
    if (a.expiryDate && b.expiryDate) return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    if (a.expiryDate) return -1
    if (b.expiryDate) return 1
    return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime()
  }
  return {
    frozen: items.filter(i => i.zone === 'frozen').sort(sortByExpiry),
    refrigerated: items.filter(i => i.zone === 'refrigerated').sort(sortByExpiry),
    room_temp: items.filter(i => i.zone === 'room_temp').sort(sortByExpiry),
  }
})
