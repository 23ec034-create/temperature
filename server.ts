import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("gallery.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/images", (req, res) => {
    try {
      const images = db.prepare("SELECT * FROM images ORDER BY created_at DESC").all();
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch images" });
    }
  });

  app.post("/api/images", (req, res) => {
    const { url, title, description } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const info = db.prepare("INSERT INTO images (url, title, description) VALUES (?, ?, ?)").run(url, title, description);
      res.json({ id: info.lastInsertRowid, url, title, description });
    } catch (error) {
      res.status(500).json({ error: "Failed to add image" });
    }
  });

  app.put("/api/images/:id", (req, res) => {
    const { id } = req.params;
    const { url, title, description } = req.body;
    
    try {
      db.prepare("UPDATE images SET url = ?, title = ?, description = ? WHERE id = ?").run(url, title, description, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update image" });
    }
  });

  app.delete("/api/images/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM images WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
