const express = require("express");
const app = express();
const PORT = 3000;
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Sprístupni obrázky cez server
app.use('/uploads', express.static('uploads'));

const db = new sqlite3.Database('./recipix.db', (err) => {
  if (err) {
    console.error(' Error connecting to SQLite:', err.message);
  } else {
    console.log('Connected to SQLite database!');
  }
});
// This allows your app to read JSON from requests
app.use(express.json());

//Test route to check if server is running
app.get('/', (req, res) => {
    res.send('Recipix backend is running!');
});

app.get('/recipes', (req, res) => {
  db.all('SELECT * FROM recipes', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/recipes', upload.single('image'), (req, res) => {
  // Validácia povinných polí
  if (!req.body.title || !req.body.preparationTime || !req.body.servings || !req.body.steps || !req.body.ingredients) {
    return res.status(400).json({ error: "All fields (title, preparationTime, servings, steps, ingredients) are required." });
  }

  // Validácia title
  if (typeof req.body.title !== "string" || !req.body.title.trim() || req.body.title.length > 100) {
    return res.status(400).json({ error: "Title must be a non-empty string (max 100 znakov)." });
  }

  // Validácia steps
  if (typeof req.body.steps !== "string" || !req.body.steps.trim() || req.body.steps.length > 1000) {
    return res.status(400).json({ error: "Steps must be a non-empty string (max 1000 znakov)." });
  }

  // Validácia obrázka
  const imagePath = req.file ? req.file.path : null;
  if (!imagePath) {
    return res.status(400).json({ error: "Recipe image is required." });
  }

  // Validácia preparationTime a servings
  const prepTime = Number(req.body.preparationTime);
  const numServings = Number(req.body.servings);

  if (!Number.isInteger(prepTime) || prepTime <= 0 || prepTime > 1000) {
    return res.status(400).json({ error: "preparationTime must be an integer between 1 and 1000." });
  }
  if (!Number.isInteger(numServings) || numServings <= 0 || numServings > 100) {
    return res.status(400).json({ error: "servings must be an integer between 1 and 100." });
  }

  // Validácia ingrediencií
  let parsedIngredients = [];
  try {
    parsedIngredients = typeof req.body.ingredients === "string" ? JSON.parse(req.body.ingredients) : req.body.ingredients;
    if (!Array.isArray(parsedIngredients) || parsedIngredients.length === 0) {
      throw new Error();
    }
    for (const ing of parsedIngredients) {
      if (
        typeof ing.name !== "string" ||
        !ing.name.trim() ||
        !/[a-zA-ZáäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(ing.name) ||
        typeof ing.quantity !== "number" ||
        ing.quantity <= 0 ||
        typeof ing.unit !== "string" ||
        !ing.unit.trim() ||
        ing.unit.length > 20
      ) {
        throw new Error();
      }
    }
  } catch (e) {
    return res.status(400).json({ error: "Ingredients must be a non-empty array of valid ingredient objects." });
  }

  db.run(
    `INSERT INTO recipes (title, preparationTime, servings, steps, imagePath) VALUES (?, ?, ?, ?, ?)`,
    [req.body.title, prepTime, numServings, req.body.steps, imagePath],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const recipeId = this.lastID;

      function addIngredients(index) {
        if (index >= parsedIngredients.length) {
          res.json({ message: 'Recipe added!', recipeId });
          return;
        }
        const ingredient = parsedIngredients[index];
        db.get(
          `SELECT id FROM ingredients WHERE name = ?`,
          [ingredient.name],
          (err, row) => {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            if (row) {
              insertRecipeIngredient(row.id);
            } else {
              db.run(
                `INSERT INTO ingredients (name) VALUES (?)`,
                [ingredient.name],
                function (err) {
                  if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                  }
                  insertRecipeIngredient(this.lastID);
                }
              );
            }
          }
        );

        function insertRecipeIngredient(ingredientId) {
          db.run(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)`,
            [recipeId, ingredientId, ingredient.quantity, ingredient.unit],
            (err) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              addIngredients(index + 1);
            }
          );
        }
      }

      addIngredients(0);
    }
  );
});

app.get('/ingredients', (req, res) => {
  db.all('SELECT * FROM ingredients', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/ingredients', (req, res) => {
  const { name } = req.body;
  // Validácia
  if (
    typeof name !== "string" ||
    !name.trim() ||
    !/[a-zA-ZáäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(name)
  ) {
    res.status(400).json({ error: "Ingredient name must be a non-empty string containing at least one letter." });
    return;
  }
  db.run(
    `INSERT INTO ingredients (name) VALUES (?)`,
    [name.trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          res.status(400).json({ error: "Ingredient name must be unique." });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.json({ message: 'Ingredient added!', ingredientId: this.lastID });
    }
  );
});

// Create the ingredients table to store unique ingredients
// This allows us to reuse ingredients across multiple recipes

// and avoid duplicate ingredient names in the database.
db.run(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`);

// Create the recipe_ingredients table to link recipes and ingredients
// This table stores which ingredients (and how much of each) are used in each recipe
// It enables a many-to-many relationship between recipes and ingredients.
db.run(`
  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER,
    ingredient_id INTEGER,
    quantity REAL,
    unit TEXT,
    FOREIGN KEY(recipe_id) REFERENCES recipes(id),
    FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
  )
`);

app.get('/recipes/:id', (req, res) => {
  const recipeId = req.params.id;
  db.get('SELECT * FROM recipes WHERE id = ?', [recipeId], (err, recipe) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    db.all(
      `SELECT i.name, ri.quantity, ri.unit
       FROM recipe_ingredients ri
       JOIN ingredients i ON ri.ingredient_id = i.id
       WHERE ri.recipe_id = ?`,
      [recipeId],
      (err, ingredients) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ ...recipe, ingredients });
      }
    );
  });
});

app.put('/recipes/:id', (req, res) => {
  const recipeId = req.params.id;
  const { rating, notes } = req.body;

  const ratingNumber = Number(rating);
  console.log("RAW rating:", rating, "Type:", typeof rating, "ratingNumber:", ratingNumber);

  // Validácia ratingu
  if (
    rating === undefined ||
    rating === null ||
    !Number.isInteger(ratingNumber) ||
    ratingNumber < 1 ||
    ratingNumber > 5
  ) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
  }

  // Validácia poznámky
  if (notes && (typeof notes !== "string" || notes.length > 200)) {
    return res.status(400).json({ error: "Notes must be a string with max 200 characters." });
  }

  db.run(
    `UPDATE recipes SET rating = ?, notes = ? WHERE id = ?`,
    [ratingNumber, notes, recipeId],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Recipe updated!' });
    }
  );
});

app.put('/recipes/:id/favorite', (req, res) => {
  const recipeId = req.params.id;
  const { favorite } = req.body;

  // Validácia favorite
  if (typeof favorite !== "boolean") {
    return res.status(400).json({ error: "Favorite must be true or false." });
  }

  db.run(
    `UPDATE recipes SET favorite = ? WHERE id = ?`,
    [favorite, recipeId],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Favorite status updated!' });
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

