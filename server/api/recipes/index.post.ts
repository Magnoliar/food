import { parseRecipeCreate, type RecipeIngredientInput } from '../../schemas/recipe'
import { serializeRecipe } from '../../serializers/recipe'
import { recordAchievementEvent } from '../../services/achievement'
import { prisma } from '../../utils/prisma'

async function syncIngredients(recipeId: string, ingredients: RecipeIngredientInput[], tx: any) {
  // 按名称去重，保留最后出现的条目
  const deduped = new Map<string, RecipeIngredientInput>()
  for (const ing of ingredients) {
    if (ing.name?.trim()) deduped.set(ing.name.trim(), ing)
  }

  for (const ing of deduped.values()) {
    const trimmedName = ing.name.trim()
    const ingredient = await tx.ingredient.upsert({
      where: { name: trimmedName },
      create: { name: trimmedName, category: ing.category || null },
      update: {},
    })

    await tx.recipeIngredient.create({
      data: {
        recipeId,
        ingredientId: ingredient.id,
        amount: ing.amount || null,
        unit: ing.unit || null,
        optional: ing.optional || false,
      },
    })
  }
}

async function connectTags(recipeId: string, tags: string[], tx: any) {
  for (const tagName of tags) {
    let tag = await tx.tag.findFirst({ where: { name: tagName } })
    if (!tag) {
      tag = await tx.tag.create({ data: { name: tagName, dimension: 'custom' } })
    }
    await tx.recipe.update({
      where: { id: recipeId },
      data: { tags: { connect: { id: tag.id } } },
    })
  }
}

export default defineEventHandler(async (event) => {
  const body = parseRecipeCreate(await readBody(event))

  const recipe = await prisma.$transaction(async (tx) => {
    const created = await tx.recipe.create({
      data: {
        name: body.name!,
        description: body.description || null,
        category: body.category || null,
        status: body.status || 'want_to_make',
        difficulty: body.difficulty || 3,
        estimatedTime: body.estimatedTime || 30,
        score: body.score || 0,
        cookCount: 0,
        steps: JSON.stringify(body.steps || []),
        tip: body.tip || null,
        coverColor: body.coverColor || null,
        coverPhotoUrl: body.coverPhotoUrl || null,
        notes: body.notes || null,
      },
    })

    if (body.ingredients?.length) await syncIngredients(created.id, body.ingredients as RecipeIngredientInput[], tx)
    if (body.tags?.length) await connectTags(created.id, body.tags as string[], tx)

    return tx.recipe.findUnique({
      where: { id: created.id },
      include: { tags: true, ingredients: { include: { ingredient: true } } },
    })
  })

  await recordAchievementEvent('recipe_created', event.context.authUser?.id, recipe?.id)
  return serializeRecipe(recipe)
})
