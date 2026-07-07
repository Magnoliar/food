import { parseRecipePatch, type RecipeIngredientInput } from '../../schemas/recipe'
import { serializeRecipe } from '../../serializers/recipe'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少菜谱 ID' })

  const body = parseRecipePatch(await readBody(event))
  const data: any = {}
  for (const field of ['name', 'description', 'status', 'score', 'difficulty', 'estimatedTime', 'cookCount', 'tip', 'coverColor', 'coverPhotoUrl', 'category', 'notes']) {
    if ((body as any)[field] !== undefined) data[field] = (body as any)[field]
  }
  if (body.steps !== undefined) data.steps = JSON.stringify(body.steps)

  try {
    const recipe = await prisma.$transaction(async (tx) => {
      if (body.ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } })
        for (const ing of body.ingredients as RecipeIngredientInput[]) {
          const trimmedName = ing.name?.trim()
          if (!trimmedName) continue
          let ingredient = await tx.ingredient.findUnique({ where: { name: trimmedName } })
          if (!ingredient) {
            ingredient = await tx.ingredient.create({
              data: { name: trimmedName, category: ing.category || null },
            })
          }
          await tx.recipeIngredient.create({
            data: {
              recipeId: id,
              ingredientId: ingredient.id,
              amount: ing.amount || null,
              unit: ing.unit || null,
              optional: ing.optional || false,
            },
          })
        }
      }

      if (body.tags !== undefined) {
        const tagIds: string[] = []
        for (const tagName of body.tags as string[]) {
          let tag = await tx.tag.findFirst({ where: { name: tagName } })
          if (!tag) tag = await tx.tag.create({ data: { name: tagName, dimension: 'custom' } })
          tagIds.push(tag.id)
        }
        data.tags = { set: tagIds.map(tagId => ({ id: tagId })) }
      }

      return tx.recipe.update({
        where: { id },
        data,
        include: { tags: true, ingredients: { include: { ingredient: true } } },
      })
    })

    return serializeRecipe(recipe)
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '菜谱不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})
