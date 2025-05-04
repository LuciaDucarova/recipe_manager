const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    preparationTime: {
        type: Number,
        required: true
    },
    servings: {
        type: Number,
        required: true
    },
    steps: [{
        type: String,
        required: true
    }],
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 0
    },
    favorite: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        default: ''
    },
    ingredients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ingredient'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Recipe', recipeSchema); 