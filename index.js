const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bbgsyar.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();

        const db = client.db('recipeDB');
        const recipesCollection = db.collection('recipes');
        const usersCollection = db.collection('users');

        //  Get top 6 recipes sorted by likes (this must come before the dynamic :id route)
        app.get('/recipes/top-liked', async (req, res) => {
            try {
                const topRecipes = await recipesCollection
                    .find({ likes: { $exists: true, $type: 'int' } })
                    .sort({ likes: -1 })
                    .limit(6)
                    .toArray();
                res.send(topRecipes);
            } catch (err) {
                console.error('Error fetching top liked recipes:', err);
                res.status(500).send({ message: 'Failed to fetch top liked recipes' });
            }
        });

        // Get all recipes (or by owner email)
        app.get('/recipes', async (req, res) => {
            const email = req.query.email;
            const query = email ? { ownerEmail: email } : {};
            try {
                const result = await recipesCollection.find(query).toArray();
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Failed to fetch recipes' });
            }
        });

        //  Get a single recipe by ID (must be after /top-liked)
        app.get('/recipes/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const recipe = await recipesCollection.findOne({ _id: new ObjectId(id) });
                if (!recipe) return res.status(404).send({ message: 'Recipe not found' });
                res.send(recipe);
            } catch (err) {
                console.error(err);
                res.status(400).send({ message: 'Invalid recipe ID' });
            }
        });

        // Add a new recipe
        app.post('/recipes', async (req, res) => {
            const recipe = req.body;

            if (!recipe.ownerEmail) {
                return res.status(400).send({ message: "ownerEmail is required" });
            }

            recipe.likes = 0; 
            try {
                const result = await recipesCollection.insertOne(recipe);
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Failed to add recipe' });
            }
        });

        // Update a recipe
        app.put('/recipes/:id', async (req, res) => {
            const id = req.params.id;
            const updatedRecipe = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    image: updatedRecipe.image,
                    title: updatedRecipe.title,
                    ingredients: updatedRecipe.ingredients,
                    instructions: updatedRecipe.instructions,
                    cuisine: updatedRecipe.cuisine,
                    prepTime: updatedRecipe.prepTime,
                    categories: updatedRecipe.categories,
                },
            };

            try {
                const result = await recipesCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Failed to update recipe' });
            }
        });

        // Delete a recipe
        app.delete('/recipes/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await recipesCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(400).send({ message: 'Invalid recipe ID' });
            }
        });

        // Like a recipe (increment likes)
        app.patch('/recipes/:id/like', async (req, res) => {
            try {
                const id = req.params.id;
                const result = await recipesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $inc: { likes: 1 } }
                );

                if (result.modifiedCount > 0) {
                    res.send({ success: true, message: 'Like added' });
                } else {
                    res.status(404).send({ success: false, message: 'Recipe not found' });
                }
            } catch (error) {
                console.error('Error updating likes:', error);
                res.status(500).send({ success: false, message: 'Server error' });
            }
        });

        // Add a user
        app.post('/users', async (req, res) => {
            try {
                const userProfile = req.body;
                const result = await usersCollection.insertOne(userProfile);
                res.send(result);
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Failed to add user' });
            }
        });

        // Confirm DB connection
        await client.db("admin").command({ ping: 1 });
        console.log(" Connected to MongoDB");

    } finally {
        
    }
}

run().catch(console.dir);

// Base route
app.get('/', (req, res) => {
    res.send(' Explore recipes and make your own!');
});

// Start server
app.listen(port, () => {
    console.log(` Server running at http://localhost:${port}`);
});
