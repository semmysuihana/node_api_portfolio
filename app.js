require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();

app.use(bodyParser.json());
app.use(cors());

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    require: true,
    rejectUnauthorized: false, // supaya gak perlu verifikasi sertifikat lokal
  },
});

// Test koneksi
pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Error acquiring client", err.stack);
  }
  console.log("✅ Connected to PostgreSQL (Neon)");
  release();
});

// Ambil Project dari postgres
app.get("/project", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM project");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching project");
  }
});

// Start the Express server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
