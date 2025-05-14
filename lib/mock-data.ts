// Mock data for recipes based on Spoonacular API format
export const mockRecipes = [
  {
    id: 716429,
    title: "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs",
    image: "https://spoonacular.com/recipeImages/716429-556x370.jpg",
    servings: 2,
    readyInMinutes: 45,
    healthScore: 35.0,
    pricePerServing: 163.15,
    vegan: false,
    vegetarian: true,
    glutenFree: false,
    dairyFree: true,
    veryHealthy: true,
    cheap: false,
    veryPopular: true,
    sustainable: false,
    lowFodmap: false,
    cuisines: ["Italian", "Mediterranean"],
    dishTypes: ["lunch", "main course", "main dish", "dinner"],
    diets: ["dairy free"],
    summary:
      "Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs might be a good recipe to expand your main course repertoire. One serving contains <b>543 calories</b>, <b>17g of protein</b>, and <b>16g of fat</b>. For <b>$1.63 per serving</b>, this recipe <b>covers 22%</b> of your daily requirements of vitamins and minerals.",
    analyzedInstructions: [
      {
        name: "",
        steps: [
          {
            number: 1,
            step: "Cook the pasta according to package directions.",
            ingredients: [
              {
                id: 20420,
                name: "pasta",
                localizedName: "pasta",
                image: "fusilli.jpg",
              },
            ],
            equipment: [],
          },
          {
            number: 2,
            step: "Meanwhile, heat the oil in a skillet and cook the garlic and scallions until tender.",
            ingredients: [
              {
                id: 11215,
                name: "garlic",
                localizedName: "garlic",
                image: "garlic.png",
              },
              {
                id: 11291,
                name: "scallions",
                localizedName: "scallions",
                image: "spring-onions.jpg",
              },
            ],
            equipment: [
              {
                id: 404645,
                name: "frying pan",
                localizedName: "frying pan",
                image: "pan.png",
              },
            ],
          },
        ],
      },
    ],
    extendedIngredients: [
      {
        id: 20420,
        aisle: "Pasta and Rice",
        image: "fusilli.jpg",
        consistency: "solid",
        name: "pasta",
        amount: 200.0,
        unit: "g",
        original: "200g pasta",
        originalName: "pasta",
        meta: [],
      },
      {
        id: 11215,
        aisle: "Produce",
        image: "garlic.png",
        consistency: "solid",
        name: "garlic",
        amount: 2.0,
        unit: "cloves",
        original: "2 cloves garlic",
        originalName: "garlic",
        meta: [],
      },
      {
        id: 11291,
        aisle: "Produce",
        image: "spring-onions.jpg",
        consistency: "solid",
        name: "scallions",
        amount: 3.0,
        unit: "",
        original: "3 scallions",
        originalName: "scallions",
        meta: [],
      },
      {
        id: 10011135,
        aisle: "Produce",
        image: "cauliflower.jpg",
        consistency: "solid",
        name: "cauliflower",
        amount: 0.5,
        unit: "head",
        original: "1/2 head cauliflower",
        originalName: "cauliflower",
        meta: [],
      },
      {
        id: 18079,
        aisle: "Pasta and Rice",
        image: "breadcrumbs.jpg",
        consistency: "solid",
        name: "breadcrumbs",
        amount: 0.25,
        unit: "cup",
        original: "1/4 cup breadcrumbs",
        originalName: "breadcrumbs",
        meta: [],
      },
      {
        id: 4053,
        aisle: "Oil, Vinegar, Salad Dressing",
        image: "olive-oil.jpg",
        consistency: "liquid",
        name: "olive oil",
        amount: 2.0,
        unit: "tablespoons",
        original: "2 tablespoons olive oil",
        originalName: "olive oil",
        meta: [],
      },
    ],
  },
  {
    id: 715594,
    title: "Homemade Garlic and Basil French Fries",
    image: "https://spoonacular.com/recipeImages/715594-556x370.jpg",
    servings: 2,
    readyInMinutes: 45,
    healthScore: 77.0,
    pricePerServing: 83.23,
    vegan: true,
    vegetarian: true,
    glutenFree: true,
    dairyFree: true,
    veryHealthy: true,
    cheap: true,
    veryPopular: true,
    sustainable: false,
    lowFodmap: false,
    cuisines: ["American"],
    dishTypes: ["side dish"],
    diets: ["gluten free", "dairy free", "lacto ovo vegetarian", "vegan"],
    summary:
      "Homemade Garlic and Basil French Fries might be just the side dish you are searching for. This recipe makes 2 servings with <b>596 calories</b>, <b>8g of protein</b>, and <b>15g of fat</b> each. For <b>83 cents per serving</b>, this recipe <b>covers 23%</b> of your daily requirements of vitamins and minerals.",
    analyzedInstructions: [
      {
        name: "",
        steps: [
          {
            number: 1,
            step: "Cut potatoes into thin strips.",
            ingredients: [
              {
                id: 11352,
                name: "potato",
                localizedName: "potato",
                image: "potatoes-yukon-gold.png",
              },
            ],
            equipment: [],
          },
          {
            number: 2,
            step: "Place in bowl of cold water for 1-3 hours.",
            ingredients: [
              {
                id: 14412,
                name: "water",
                localizedName: "water",
                image: "water.png",
              },
            ],
            equipment: [
              {
                id: 404783,
                name: "bowl",
                localizedName: "bowl",
                image: "bowl.jpg",
              },
            ],
            length: {
              number: 180,
              unit: "minutes",
            },
          },
        ],
      },
    ],
    extendedIngredients: [
      {
        id: 11352,
        aisle: "Produce",
        image: "potatoes-yukon-gold.png",
        consistency: "solid",
        name: "potatoes",
        amount: 2.0,
        unit: "large",
        original: "2 large russet potatoes",
        originalName: "russet potatoes",
        meta: [],
      },
      {
        id: 11215,
        aisle: "Produce",
        image: "garlic.png",
        consistency: "solid",
        name: "garlic",
        amount: 3.0,
        unit: "cloves",
        original: "3 cloves garlic, minced",
        originalName: "garlic, minced",
        meta: ["minced"],
      },
      {
        id: 2044,
        aisle: "Produce",
        image: "fresh-basil.jpg",
        consistency: "solid",
        name: "basil",
        amount: 2.0,
        unit: "tablespoons",
        original: "2 tablespoons fresh basil, chopped",
        originalName: "fresh basil, chopped",
        meta: ["fresh", "chopped"],
      },
      {
        id: 4053,
        aisle: "Oil, Vinegar, Salad Dressing",
        image: "olive-oil.jpg",
        consistency: "liquid",
        name: "olive oil",
        amount: 2.0,
        unit: "tablespoons",
        original: "2 tablespoons olive oil",
        originalName: "olive oil",
        meta: [],
      },
      {
        id: 2047,
        aisle: "Spices and Seasonings",
        image: "salt.jpg",
        consistency: "solid",
        name: "salt",
        amount: 1.0,
        unit: "teaspoon",
        original: "1 teaspoon salt",
        originalName: "salt",
        meta: [],
      },
    ],
  },
  {
    id: 715497,
    title: "Berry Banana Breakfast Smoothie",
    image: "https://spoonacular.com/recipeImages/715497-556x370.jpg",
    servings: 1,
    readyInMinutes: 5,
    healthScore: 64.0,
    pricePerServing: 206.79,
    vegan: true,
    vegetarian: true,
    glutenFree: true,
    dairyFree: true,
    veryHealthy: true,
    cheap: false,
    veryPopular: true,
    sustainable: false,
    lowFodmap: false,
    cuisines: [],
    dishTypes: ["morning meal", "breakfast", "beverage", "drink"],
    diets: ["gluten free", "dairy free", "lacto ovo vegetarian", "vegan"],
    summary:
      "Berry Banana Breakfast Smoothie might be just the morn meal you are searching for. This recipe makes 1 servings with <b>501 calories</b>, <b>21g of protein</b>, and <b>11g of fat</b> each. For <b>$2.07 per serving</b>, this recipe <b>covers 32%</b> of your daily requirements of vitamins and minerals.",
    analyzedInstructions: [
      {
        name: "",
        steps: [
          {
            number: 1,
            step: "Take some yogurt in your favorite flavor and add 1 container to your blender.",
            ingredients: [
              {
                id: 1116,
                name: "yogurt",
                localizedName: "yogurt",
                image: "plain-yogurt.jpg",
              },
            ],
            equipment: [
              {
                id: 404726,
                name: "blender",
                localizedName: "blender",
                image: "blender.png",
              },
            ],
          },
          {
            number: 2,
            step: "Add in the berries, banana, and soy milk and blend until smooth.",
            ingredients: [
              {
                id: 16223,
                name: "soymilk",
                localizedName: "soymilk",
                image: "soy-milk.jpg",
              },
              {
                id: 1009054,
                name: "berries",
                localizedName: "berries",
                image: "berries-mixed.jpg",
              },
              {
                id: 9040,
                name: "banana",
                localizedName: "banana",
                image: "bananas.jpg",
              },
            ],
            equipment: [],
          },
        ],
      },
    ],
    extendedIngredients: [
      {
        id: 1116,
        aisle: "Milk, Eggs, Other Dairy",
        image: "plain-yogurt.jpg",
        consistency: "solid",
        name: "yogurt",
        amount: 1.0,
        unit: "container",
        original: "1 container vanilla yogurt",
        originalName: "vanilla yogurt",
        meta: ["vanilla"],
      },
      {
        id: 1009054,
        aisle: "Produce",
        image: "berries-mixed.jpg",
        consistency: "solid",
        name: "berries",
        amount: 0.5,
        unit: "cup",
        original: "1/2 cup berries",
        originalName: "berries",
        meta: [],
      },
      {
        id: 9040,
        aisle: "Produce",
        image: "bananas.jpg",
        consistency: "solid",
        name: "banana",
        amount: 1.0,
        unit: "",
        original: "1 banana",
        originalName: "banana",
        meta: [],
      },
      {
        id: 16223,
        aisle: "Milk, Eggs, Other Dairy",
        image: "soy-milk.jpg",
        consistency: "liquid",
        name: "soy milk",
        amount: 1.0,
        unit: "cup",
        original: "1 cup soy milk",
        originalName: "soy milk",
        meta: [],
      },
    ],
  },
  {
    id: 644387,
    title: "Garlicky Kale",
    image: "https://spoonacular.com/recipeImages/644387-556x370.jpg",
    servings: 2,
    readyInMinutes: 30,
    healthScore: 92.0,
    pricePerServing: 69.09,
    vegan: true,
    vegetarian: true,
    glutenFree: true,
    dairyFree: true,
    veryHealthy: true,
    cheap: true,
    veryPopular: false,
    sustainable: false,
    lowFodmap: false,
    cuisines: [],
    dishTypes: ["side dish"],
    diets: ["gluten free", "dairy free", "lacto ovo vegetarian", "vegan"],
    summary:
      "Garlicky Kale requires approximately <b>30 minutes</b> from start to finish. This side dish has <b>170 calories</b>, <b>2g of protein</b>, and <b>15g of fat</b> per serving. This recipe serves 2. For <b>69 cents per serving</b>, this recipe <b>covers 17%</b> of your daily requirements of vitamins and minerals.",
    analyzedInstructions: [
      {
        name: "",
        steps: [
          {
            number: 1,
            step: "Heat the olive oil in a large pot over medium heat.",
            ingredients: [
              {
                id: 4053,
                name: "olive oil",
                localizedName: "olive oil",
                image: "olive-oil.jpg",
              },
            ],
            equipment: [
              {
                id: 404752,
                name: "pot",
                localizedName: "pot",
                image: "stock-pot.jpg",
              },
            ],
          },
          {
            number: 2,
            step: "Add the kale and cover.",
            ingredients: [
              {
                id: 11233,
                name: "kale",
                localizedName: "kale",
                image: "kale.jpg",
              },
            ],
            equipment: [],
          },
        ],
      },
    ],
    extendedIngredients: [
      {
        id: 11233,
        aisle: "Produce",
        image: "kale.jpg",
        consistency: "solid",
        name: "kale",
        amount: 2.0,
        unit: "cups",
        original: "2 cups chopped kale",
        originalName: "chopped kale",
        meta: ["chopped"],
      },
      {
        id: 11215,
        aisle: "Produce",
        image: "garlic.png",
        consistency: "solid",
        name: "garlic",
        amount: 2.0,
        unit: "cloves",
        original: "2 cloves garlic",
        originalName: "garlic",
        meta: [],
      },
      {
        id: 4053,
        aisle: "Oil, Vinegar, Salad Dressing",
        image: "olive-oil.jpg",
        consistency: "liquid",
        name: "olive oil",
        amount: 1.0,
        unit: "tablespoon",
        original: "1 tablespoon olive oil",
        originalName: "olive oil",
        meta: [],
      },
      {
        id: 2047,
        aisle: "Spices and Seasonings",
        image: "salt.jpg",
        consistency: "solid",
        name: "salt",
        amount: 0.5,
        unit: "teaspoon",
        original: "1/2 teaspoon salt",
        originalName: "salt",
        meta: [],
      },
    ],
  },
  {
    id: 782601,
    title: "Red Kidney Bean Jambalaya",
    image: "https://spoonacular.com/recipeImages/782601-556x370.jpg",
    servings: 6,
    readyInMinutes: 45,
    healthScore: 96.0,
    pricePerServing: 163.15,
    vegan: true,
    vegetarian: true,
    glutenFree: true,
    dairyFree: true,
    veryHealthy: true,
    cheap: false,
    veryPopular: true,
    sustainable: false,
    lowFodmap: false,
    cuisines: ["Cajun", "Creole"],
    dishTypes: ["lunch", "main course", "main dish", "dinner"],
    diets: ["gluten free", "dairy free", "lacto ovo vegetarian", "vegan"],
    summary:
      "Red Kidney Bean Jambalaya might be just the <b>Creole</b> recipe you are searching for. One serving contains <b>538 calories</b>, <b>21g of protein</b>, and <b>8g of fat</b>. For <b>$1.69 per serving</b>, this recipe <b>covers 34%</b> of your daily requirements of vitamins and minerals.",
    analyzedInstructions: [
      {
        name: "",
        steps: [
          {
            number: 1,
            step: "Heat the oil in a large pot over medium heat.",
            ingredients: [
              {
                id: 4582,
                name: "cooking oil",
                localizedName: "cooking oil",
                image: "vegetable-oil.jpg",
              },
            ],
            equipment: [
              {
                id: 404752,
                name: "pot",
                localizedName: "pot",
                image: "stock-pot.jpg",
              },
            ],
          },
          {
            number: 2,
            step: "Add the onion, bell pepper, and celery and sauté until the onion is translucent, about 5 minutes.",
            ingredients: [
              {
                id: 10211821,
                name: "bell pepper",
                localizedName: "bell pepper",
                image: "bell-pepper-orange.png",
              },
              {
                id: 11143,
                name: "celery",
                localizedName: "celery",
                image: "celery.jpg",
              },
              {
                id: 11282,
                name: "onion",
                localizedName: "onion",
                image: "brown-onion.png",
              },
            ],
            equipment: [],
            length: {
              number: 5,
              unit: "minutes",
            },
          },
        ],
      },
    ],
    extendedIngredients: [
      {
        id: 4582,
        aisle: "Oil, Vinegar, Salad Dressing",
        image: "vegetable-oil.jpg",
        consistency: "liquid",
        name: "canola oil",
        amount: 2.0,
        unit: "tablespoons",
        original: "2 tablespoons canola oil",
        originalName: "canola oil",
        meta: [],
      },
      {
        id: 11282,
        aisle: "Produce",
        image: "brown-onion.png",
        consistency: "solid",
        name: "onion",
        amount: 1.0,
        unit: "large",
        original: "1 large onion, chopped",
        originalName: "onion, chopped",
        meta: ["chopped"],
      },
      {
        id: 10211821,
        aisle: "Produce",
        image: "bell-pepper-orange.png",
        consistency: "solid",
        name: "bell pepper",
        amount: 1.0,
        unit: "large",
        original: "1 large green bell pepper, chopped",
        originalName: "green bell pepper, chopped",
        meta: ["green", "chopped"],
      },
      {
        id: 11143,
        aisle: "Produce",
        image: "celery.jpg",
        consistency: "solid",
        name: "celery",
        amount: 2.0,
        unit: "stalks",
        original: "2 stalks celery, chopped",
        originalName: "celery, chopped",
        meta: ["chopped"],
      },
      {
        id: 16033,
        aisle: "Canned and Jarred",
        image: "kidney-beans.jpg",
        consistency: "solid",
        name: "kidney beans",
        amount: 30.0,
        unit: "ounce",
        original: "2 (15 ounce) cans kidney beans, drained and rinsed",
        originalName: "kidney beans, drained and rinsed",
        meta: ["drained and rinsed", "canned"],
      },
      {
        id: 10220445,
        aisle: "Pasta and Rice",
        image: "uncooked-white-rice.png",
        consistency: "solid",
        name: "rice",
        amount: 1.0,
        unit: "cup",
        original: "1 cup uncooked brown rice",
        originalName: "uncooked brown rice",
        meta: ["brown", "uncooked"],
      },
    ],
  },
  {
    id: 795751,
    title: "Chicken Fajita Stuffed Bell Pepper",
    image: "https://spoonacular.com/recipeImages/795751-556x370.jpg",
    servings: 3,
    readyInMinutes: 45,
    healthScore: 84.0,
    pricePerServing: 272.2,
    vegan: false,
    vegetarian: false,
    glutenFree: true,
    dairyFree: false,
    veryHealthy: true,
    cheap: false,
    veryPopular: false,
    sustainable: false,
    lowFodmap: false,
    cuisines: ["Mexican"],
    dishTypes: ["lunch", "main course", "main dish", "dinner"],
    diets: ["gluten free"],
    summary:
      "Chicken Fajita Stuffed Bell Pepper might be just the <b>Mexican</b> recipe you are searching for. One serving contains <b>561 calories</b>, <b>36g of protein</b>, and <b>24g of fat</b>. For <b>$2.96 per serving</b>, this recipe <b>covers 40%</b> of your daily requirements of vitamins and minerals.",
    analyzedInstructions: [
      {
        name: "",
        steps: [
          {
            number: 1,
            step: "To get started heat oven to 35",
            ingredients: [],
            equipment: [
              {
                id: 404784,
                name: "oven",
                localizedName: "oven",
                image: "oven.jpg",
              },
            ],
          },
          {
            number: 2,
            step: "Cut the bell pepper in half (if you haven't already) and clean out the seeds.",
            ingredients: [
              {
                id: 10211821,
                name: "bell pepper",
                localizedName: "bell pepper",
                image: "bell-pepper-orange.png",
              },
              {
                id: 93818,
                name: "seeds",
                localizedName: "seeds",
                image: "sunflower-seeds.jpg",
              },
            ],
            equipment: [],
          },
        ],
      },
    ],
    extendedIngredients: [
      {
        id: 10211821,
        aisle: "Produce",
        image: "bell-pepper-orange.png",
        consistency: "solid",
        name: "bell pepper",
        amount: 1.0,
        unit: "large",
        original: "1 large bell pepper",
        originalName: "bell pepper",
        meta: [],
      },
      {
        id: 5114,
        aisle: "Meat",
        image: "rotisserie-chicken.png",
        consistency: "solid",
        name: "rotisserie chicken",
        amount: 0.5,
        unit: "cup",
        original: "1/2 cup shredded rotisserie chicken",
        originalName: "shredded rotisserie chicken",
        meta: ["shredded"],
      },
      {
        id: 11282,
        aisle: "Produce",
        image: "brown-onion.png",
        consistency: "solid",
        name: "onion",
        amount: 0.25,
        unit: "cup",
        original: "1/4 cup chopped onion",
        originalName: "chopped onion",
        meta: ["chopped"],
      },
      {
        id: 1001009,
        aisle: "Cheese",
        image: "shredded-cheddar.jpg",
        consistency: "solid",
        name: "cheddar cheese",
        amount: 0.25,
        unit: "cup",
        original: "1/4 cup shredded cheddar cheese",
        originalName: "shredded cheddar cheese",
        meta: ["shredded"],
      },
      {
        id: 1041009,
        aisle: "Cheese",
        image: "cheddar-cheese.png",
        consistency: "solid",
        name: "cheese",
        amount: 2.0,
        unit: "tablespoons",
        original: "2 tablespoons cheese",
        originalName: "cheese",
        meta: [],
      },
      {
        id: 2031,
        aisle: "Spices and Seasonings",
        image: "chili-powder.jpg",
        consistency: "solid",
        name: "cayenne pepper",
        amount: 0.25,
        unit: "teaspoon",
        original: "1/4 teaspoon cayenne pepper",
        originalName: "cayenne pepper",
        meta: [],
      },
    ],
  },
]

// Extract all unique ingredients from the mock recipes
export const mockIngredients = Array.from(
  new Set(mockRecipes.flatMap((recipe) => recipe.extendedIngredients.map((ingredient) => ingredient.name))),
).sort()

// Helper function to get a filtered list of recipes based on criteria
export const getFilteredRecipes = (filters: any) => {
  let filteredRecipes = [...mockRecipes]

  // Filter by prep time
  if (filters.prepTime !== "any") {
    switch (filters.prepTime) {
      case "under15":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.readyInMinutes < 15)
        break
      case "under30":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.readyInMinutes < 30)
        break
      case "under60":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.readyInMinutes < 60)
        break
      case "over60":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.readyInMinutes >= 60)
        break
    }
  }

  // Filter by budget
  if (filters.budget !== "any") {
    switch (filters.budget) {
      case "cheap":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.cheap || recipe.pricePerServing < 100)
        break
      case "moderate":
        filteredRecipes = filteredRecipes.filter(
          (recipe) => recipe.pricePerServing >= 100 && recipe.pricePerServing < 200,
        )
        break
      case "expensive":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.pricePerServing >= 200)
        break
    }
  }

  // Filter by diet
  if (filters.diet !== "any") {
    switch (filters.diet) {
      case "vegetarian":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.vegetarian)
        break
      case "vegan":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.vegan)
        break
      case "glutenFree":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.glutenFree)
        break
      case "keto":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.veryHealthy && recipe.glutenFree)
        break
      case "paleo":
        filteredRecipes = filteredRecipes.filter((recipe) => recipe.glutenFree && recipe.dairyFree)
        break
    }
  }

  // Filter by taste (simplified)
  if (filters.taste !== "any") {
    // This is a simplified approach since we don't have taste data
    switch (filters.taste) {
      case "sweet":
        filteredRecipes = filteredRecipes.filter(
          (recipe) =>
            recipe.title.toLowerCase().includes("sweet") ||
            recipe.title.toLowerCase().includes("fruit") ||
            recipe.title.toLowerCase().includes("berry") ||
            recipe.title.toLowerCase().includes("banana"),
        )
        break
      case "salty":
        filteredRecipes = filteredRecipes.filter(
          (recipe) =>
            recipe.extendedIngredients.some((ing) => ing.name === "salt") ||
            recipe.title.toLowerCase().includes("salt"),
        )
        break
      case "spicy":
        filteredRecipes = filteredRecipes.filter(
          (recipe) =>
            recipe.title.toLowerCase().includes("spicy") ||
            recipe.extendedIngredients.some(
              (ing) => ing.name.includes("pepper") || ing.name.includes("chili") || ing.name.includes("cayenne"),
            ),
        )
        break
      case "savory":
        filteredRecipes = filteredRecipes.filter(
          (recipe) =>
            !recipe.title.toLowerCase().includes("sweet") &&
            !recipe.title.toLowerCase().includes("fruit") &&
            !recipe.title.toLowerCase().includes("berry") &&
            !recipe.title.toLowerCase().includes("banana"),
        )
        break
    }
  }

  // Filter by ingredients
  if (filters.ingredients.length > 0) {
    filteredRecipes = filteredRecipes.filter((recipe) =>
      filters.ingredients.every((ingredient) =>
        recipe.extendedIngredients.some((ing) => ing.name.toLowerCase().includes(ingredient.toLowerCase())),
      ),
    )
  }

  return filteredRecipes
}
