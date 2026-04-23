export interface GrillRecipeDefinition {
  id: string;
  name: string;
  ingredients: Record<string, number>;
  score: number;
}

export const GRILL_RECIPES: ReadonlyArray<GrillRecipeDefinition> = [
  {
    id: 'lake_skewer',
    name: 'Lake Skewer',
    ingredients: { carp: 2 },
    score: 25,
  },
  {
    id: 'crispy_perch_plate',
    name: 'Crispy Perch Plate',
    ingredients: { perch: 2, carp: 1 },
    score: 65,
  },
  {
    id: 'rare_bream_steak',
    name: 'Rare Bream Steak',
    ingredients: { bream: 1, perch: 1 },
    score: 150,
  },
  {
    id: 'deepwater_platter',
    name: 'Deepwater Platter',
    ingredients: { catfish: 2, bream: 1 },
    score: 420,
  },
  {
    id: 'cosmic_grill',
    name: 'Cosmic Grill',
    ingredients: { goldfish: 1, mutant: 1 },
    score: 1200,
  },
] as const;

export const getGrillRecipe = (recipeId: string) => (
  GRILL_RECIPES.find((recipe) => recipe.id === recipeId) ?? null
);
