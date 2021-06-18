import express from "express";
import cors from "cors";
import Joi from "joi";
import pg from "pg";
import dayjs from "dayjs";

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
  const nameValidation = nameSchema.validate(req.body);
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
      const initialLetters = req.query.cpf || "";
      const customers = await connection.query(`SELECT * from customers WHERE cpf LIKE $1`, [initialLetters + "%"]);
      if (customers.rowCount === 0) {
          res.sendStatus(404);
          return;
      }
      res.send(customers.rows);

  }
  catch (err) {
      console.log(err);
      res.sendStatus(500)
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

////////////// SCHEMA PARA CLIENTES//////////////////////

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

////////////// SCHEMA PARA CLIENTES//////////////////////

app.post("/customers", async (req, res) => {
  const registeredCpfs = await connection.query("SELECT cpf FROM customers");
  const registeredCpfsValues = registeredCpfs.rows.map((c) => c.cpf);

  const { name, phone, cpf, birthday } = req.body;

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

app.put("/customers/:id", async (req, res) => {
  const { name, phone, cpf, birthday } = req.body;
  const { id } = req.params;
  const customerValidation = customerSchema.validate(req.body);
  const registeredCpfs = await connection.query("SELECT cpf FROM customers");
  const registeredCpfsValues = registeredCpfs.rows.map((c) => c.cpf);

  try {
    if (customerValidation.error) {
      res.sendStatus(400);
      return;
    }

    if (registeredCpfsValues.includes(cpf)) {
      res.sendStatus(409);
      return;
    }
    await connection.query(
      "UPDATE customers SET name=$1,phone=$2,cpf=$3,birthday=$4 WHERE id=$5",
      [name, phone, cpf, birthday, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/rentals", async (req, res) => {
  const { customerId, gameId } = req.query;

  try {
    if (customerId && gameId) {
      const result = await connection.query(
        `
              SELECT rentals.*, 
              jsonb_build_object('name', customers.name, 'id', customers.id) AS customer,
              jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game            
              FROM rentals 
              JOIN customers ON rentals."customerId" = customers.id
              JOIN games ON rentals."gameId" = games.id
              JOIN categories ON categories.id = games."categoryId"
              WHERE rentals."customerId"=$1 AND rentals."gameId"=$2`,
        [customerId, gameId]
      );

      if (result.rows.length === 0) {
        return res.sendStatus(404);
      }

      res.send(result.rows);
    } else if (customerId) {
      const result = await connection.query(
        `
              SELECT rentals.*, 
              jsonb_build_object('name', customers.name, 'id', customers.id) AS customer,
              jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game            
              FROM rentals 
              JOIN customers ON rentals."customerId" = customers.id
              JOIN games ON rentals."gameId" = games.id
              JOIN categories ON categories.id = games."categoryId"
              WHERE rentals."customerId"=$1`,
        [customerId]
      );

      if (result.rows.length === 0) {
        return res.sendStatus(404);
      }

      res.send(result.rows);
    } else if (gameId) {
      const result = await connection.query(
        `
              SELECT rentals.*, 
              jsonb_build_object('name', customers.name, 'id', customers.id) AS customer,
              jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game            
              FROM rentals 
              JOIN customers ON rentals."customerId" = customers.id
              JOIN games ON rentals."gameId" = games.id
              JOIN categories ON categories.id = games."categoryId"
              WHERE rentals."gameId"=$1`,
        [gameId]
      );

      if (!result.rows.length) {
        return res.sendStatus(404);
      }

      res.send(result.rows);
    } else {
      const result = await connection.query(`
              SELECT rentals.*, 
              jsonb_build_object('name', customers.name, 'id', customers.id) AS customer,
              jsonb_build_object('id', games.id, 'name', games.name, 'categoryId', games."categoryId", 'categoryName', categories.name) AS game            
              FROM rentals 
              JOIN customers ON rentals."customerId" = customers.id
              JOIN games ON rentals."gameId" = games.id
              JOIN categories ON categories.id = games."categoryId"`);

      res.send(result.rows);
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
});

app.post("/rentals", async (req, res) => {
  const { customerId, gameId, daysRented } = req.body;
  const rentedGames = await connection.query(
    `SELECT * FROM rentals WHERE "gameId"=$1`,
    [gameId]
  );
  const availableGames = await connection.query(
    `SELECT "stockTotal" FROM games WHERE id=$1`,
    [gameId]
  );

  let pricePerDay = await connection.query(
    `SELECT "pricePerDay" FROM games WHERE id=$1`,
    [gameId]
  );

  let originalPrice = daysRented * pricePerDay.rows[0].pricePerDay;

  const rentDate = new Date();

  let isGameRegistered = await connection.query(
    "SELECT * FROM games WHERE id=$1",
    [gameId]
  );
  let isCustomerRegistered = await connection.query(
    "SELECT * FROM customers WHERE id=$1",
    [customerId]
  );

  try {
    //console.log(availableGames.rows)
    //console.log(availableGames.rows[0].stockTotal)

    if (
      isGameRegistered.rows.length < 1 ||
      isCustomerRegistered.rows.length < 1 ||
      daysRented < 1 ||
      rentedGames.rows.length >= (availableGames.rows[0].stockTotal || 0)
    ) {
      res.sendStatus(400);
      return;
    }

    await connection.query(
      `INSERT INTO rentals ("customerId","gameId","daysRented","rentDate","originalPrice","returnDate","delayFee") values ($1,$2,$3,$4,$5,$6,$7)`,
      [customerId, gameId, daysRented, rentDate, originalPrice, null, null]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/rentals/:id/return", async (req, res) => {
  const { id } = req.params;

  try {
    const rentalOrder = await connection.query(
      `SELECT * FROM rentals WHERE id=$1`,
      [id]
    );
    //const rental = rentalOrder.rows[0];
    if (!rentalOrder.rows[0]) {
      res.sendStatus(404);
      return;
    }
    if (rentalOrder.rows[0].returnDate) {
      res.sendStatus(400);
      return;
    }

    const returnDate = new Date();
    // diferença de data em ms
    const dateDiff =
      (returnDate.getTime() - rentalOrder.rows[0].rentDate.getTime()) /
      86400000;
    const daysOfDelay = Math.floor(dateDiff);

    const delayFee =
      daysOfDelay *
      (rentalOrder.rows[0].originalPrice / rentalOrder.rows[0].daysRented);
    await connection.query(
      `UPDATE rentals SET "returnDate"=$1, "delayFee"=$2 WHERE id=$3`,
      [returnDate, delayFee, id]
    );
    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

app.delete("/rentals/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const isRentalRegistered = await connection.query(
      `SELECT * FROM rentals WHERE id=$1`,
      [id]
    );
    if (!isRentalRegistered.rows[0]) {
      res.sendStatus(404);
      return;
    }
    if (isRentalRegistered.rows[0].returnDate) {
      res.sendStatus(400);
      return;
    }
    await connection.query("DELETE FROM rentals WHERE id=$1", [id]);
    res.sendStatus(200);
  } catch {
    res.sendStatus(500);
  }
});

app.listen(4000, () => {
  console.log("iniciando o servidor");
});
