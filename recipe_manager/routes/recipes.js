const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');

// Get all recipes
router.get('/', async (req, res) => {
    try {
        const recipes = await Recipe.find().populate('ingredients');
        res.json(recipes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single recipe
router.get('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id).populate('ingredients');
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
        res.json(recipe);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a new recipe
router.post('/', async (req, res) => {
    try {
        const { title, preparationTime, servings, steps, ingredients } = req.body;
        
        // Create ingredients first
        const ingredientPromises = ingredients.map(ing => new Ingredient(ing).save());
        const savedIngredients = await Promise.all(ingredientPromises);
        
        const recipe = new Recipe({
            title,
            preparationTime,
            servings,
            steps,
            ingredients: savedIngredients.map(ing => ing._id)
        });

        const savedRecipe = await recipe.save();
        res.status(201).json(savedRecipe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a recipe
router.put('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        Object.assign(recipe, req.body);
        const updatedRecipe = await recipe.save();
        res.json(updatedRecipe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a recipe
router.delete('/:id', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        // Delete associated ingredients
        await Ingredient.deleteMany({ _id: { $in: recipe.ingredients } });
        
        await recipe.remove();
        res.json({ message: 'Recipe deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark recipe as favorite
router.put('/:id/favorite', async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        recipe.favorite = !recipe.favorite;
        const updatedRecipe = await recipe.save();
        res.json(updatedRecipe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Rate recipe and add note
router.put('/:id/rate', async (req, res) => {
    try {
        const { rating, notes } = req.body;
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        recipe.rating = rating;
        recipe.notes = notes;
        const updatedRecipe = await recipe.save();
        res.json(updatedRecipe);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 