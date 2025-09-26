require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const crypto = require("crypto");
app.use(bodyParser.json());
app.use(cors());

// Koneksi PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});

// ✅ Test koneksi
pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Error acquiring client", err.stack);
  }
  console.log("✅ Connected to PostgreSQL (Neon/Railway)");
  release();
});

function md5(text) {
  return crypto
    .createHash("md5")
    .update(text)
    .digest("hex");
}

function authTokenJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// app.get("/users", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM users");
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Error getting users");
//   }
// })

// 👉 Get login 
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashPassword = md5(password);
    const result = await pool.query(
      "SELECT id, username FROM users WHERE username = $1 AND pass = $2",
      [username, hashPassword]
    );
    if (result.rows.length === 0) {
      return res.json({ message: "User not found" });
    }
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    console.log(token, user);
    res.json({ user, token, message: "success" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error logging in");
  }
});

/* -------------------
   CRUD PROJECT
--------------------*/

// 👉 Get all projects
app.get("/project", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM project ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching projects");
  }
});


// 👉 Create new project
app.post("/project", authTokenJwt, async (req, res) => {
  try {
    const { title, content, link } = req.body;
    const img = req.body.img || "./../project.jpg";
    const result = await pool.query(
      "INSERT INTO project (name, text, img, link) VALUES ($1, $2, $3, $4) RETURNING *",
      [title, content, img, link]
    );
    res.status(201).json(result.rows[0]); // return project baru
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating project");
  }
});

// 👉 Update project by id
app.put("/project/:id" , authTokenJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, link } = req.body;
    const img = req.img || "./../project.jpg";
    const result = await pool.query(
      "UPDATE project SET name=$1, text=$2, img=$3, link=$4 WHERE id=$5 RETURNING *",
      [title, content, img, link, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating project");
  }
});

// 👉 Delete project by id
app.delete("/project/:id", authTokenJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM project WHERE id=$1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "✅ Project deleted", project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting project");
  }
});



/* -------------------
   START SERVER
--------------------*/
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
