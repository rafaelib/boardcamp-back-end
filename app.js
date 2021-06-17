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

app.post("/categories", async (req,res) => {
    const { name } = req.body;

    if (!name) {
        res.sendStatus(400);
        return;
    }

    const nameSchema = Joi.object({
        name: Joi.string().min(1).required(),
    });
    const { schemaValidationError} = nameSchema.validate({name: name});
    if(schemaValidationError){
        res.sendStatus(400);
        return;
    }
    try{
        const existingCategories = await connection.query('SELECT * FROM categories WHERE name = $1',[name]);
        if(existingCategories.rows.length>0){
            res.sendStatus(409);
            return;
        }
        await connection.query('INSERT INTO categories (name) VALUES ($1)',[name]);
        res.sendStatus(201);
    } catch{
        res.sendStatus(500);
    };
});
app.listen(4000, () => {
  console.log("iniciando o servidor");
});
