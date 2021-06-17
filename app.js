import express from "express";
import cors from "cors";
import Joi from "joi";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;
const user = {
  user: "bootcamp_role",
  password: "senha_super_hiper_ultra_secreta_do_role_do_bootcamp",
  host: "localhost",
  port: 5432,
  database: "boardcamp",
};
const connection = new Pool(user);

app.get("/categories", async (req, res) => {
  try {
    const categories = await connection.query("SELECT * FROM categories");
    res.send(categories.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/categories", async (req, res) => {
  const { name } = req.body;

  const nameSchema = Joi.object({
    name: Joi.string().trim().min(1).required(),
  });
  const nameValidation = nameSchema.validate({ name: name }); // req.body
  if (nameValidation.error) {
    res.sendStatus(400);
    return;
  }
  try {
    const existingCategories = await connection.query(
      "SELECT * FROM categories WHERE name = $1",
      [name]
    );
    if (existingCategories.rows.length > 0) {
      res.sendStatus(409);
      return;
    }
    await connection.query("INSERT INTO categories (name) VALUES ($1)", [name]);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/games", async (req, res) => {
  try {
    let games = [];
    const initialLetters = req.query.name || "";
    games = await connection.query(`SELECT * FROM games WHERE name ILIKE $1`, [
      initialLetters + "%",
    ]);
    if (games.rowCount === 0) {
      res.sendStatus(404);
      return;
    }
    res.send(games.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/games", async (req, res) => {
  const newGameSchema = Joi.object({
    name: Joi.string().trim().required(),
    image: Joi.string().required(),
    stockTotal: Joi.number().min(1).required(),
    categoryId: Joi.number().required(),
    pricePerDay: Joi.number().min(1).required(),
  });

  const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

  try {
    const existingCategories = await connection.query(
      "SELECT id FROM categories"
    );
    const existingGames = await connection.query("SELECT name FROM games");
    const existingCategoriesIds = existingCategories.rows.map((c) => c.id);
    const existingGamesNames = existingGames.rows.map((g) => g.name);

    const newGameValidation = newGameSchema.validate(req.body);

    if (
      newGameValidation.error ||
      !existingCategoriesIds.includes(categoryId)
    ) {
      res.sendStatus(400);
      return;
    }

    if (existingGamesNames.includes(name)) {
      res.sendStatus(409);
      return;
    }

    connection.query(
      `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") values ($1, $2, $3, $4, $5)`,
      [name, image, stockTotal, categoryId, pricePerDay]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/customers", async (req, res) => {
  try {
    let customers = [];
    const initialLetters = req.query.cpf || "";
    customers = await connection.query(
      `SELECT * FROM customers WHERE name ILIKE $1`,
      [initialLetters + "%"]
    );
    if (customers.rowCount === 0) {
      res.sendStatus(404);
      return;
    }
    res.send(customers.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/customers/:id", async (req, res) => {
  const customer = await connection.query(
    "SELECT * FROM customers WHERE id=$1",
    [req.params.id]
  );
  if (customer.rowCount === 0) {
    res.sendStatus(404);
    return;
  }
  res.send(customer.rows);
});

app.post("/customers", async (req, res) => {
  const registeredCpfs = await connection.query("SELECT cpf FROM customers");
  const registeredCpfsValues = registeredCpfs.rows.map((c) => c.cpf);

  const { name, phone, cpf, birthday } = req.body;

  const customerSchema = Joi.object({
    name: Joi.string().trim().min(1).required(),
    phone: Joi.string()
      .required()
      .pattern(/[0-9]{10,11}/),
    cpf: Joi.string()
      .required()
      .pattern(/[0-9]{11}/),
    birthday: Joi.string()
      .required()
      .pattern(/^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/),
  });

  const customerValidation = customerSchema.validate(req.body);
  try {
    if (customerValidation.error) {
      res.sendStatus(400);
      return;
    }

    if (registeredCpfsValues.includes(cpf)) {
      res.sendStatus(409);
      return;
    }
    connection.query(
      "INSERT INTO customers (name, phone, cpf, birthday) values ($1,$2,$3,$4)",
      [name, phone, cpf, birthday]
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.listen(4000, () => {
  console.log("iniciando o servidor");
});
