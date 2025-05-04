# Recipix - Recipe Manager Application

A public web application for recipe management, developed using Node.js and Express.js. It enables users to easily organize, manage, and rate their favorite recipes.

## Features

- View all recipes in a dashboard
- Add new recipes with detailed information
- Mark recipes as favorites
- Rate recipes and add personal notes
- Search and sort recipes
- Manage ingredients separately

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/recipix.git
cd recipix
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/recipix
```

4. Start the server:
```bash
npm run dev
```

The server will start on http://localhost:5000

## API Endpoints

### Recipes
- GET /api/recipes - Get all recipes
- GET /api/recipes/:id - Get a specific recipe
- POST /api/recipes - Create a new recipe
- PUT /api/recipes/:id - Update a recipe
- DELETE /api/recipes/:id - Delete a recipe
- PUT /api/recipes/:id/favorite - Toggle favorite status
- PUT /api/recipes/:id/rate - Rate a recipe and add notes

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 