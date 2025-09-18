import express from "express";
import fetch from "node-fetch";

const app = express();

// URL base de tu n8n
const N8N_BASE = "https://n8n-railway-production-2eac.up.railway.app/webhook/a4c766df-0e23-4b54-925f-2d25af02d024";

// Proxy para /qr/:cajeroId
app.get("/qr/:cajeroId", async (req, res) => {
  try {
    const { cajeroId } = req.params;
    const resp = await fetch(`${N8N_BASE}/qr/${cajeroId}`);
    
    // Si tu n8n devuelve JSON
    if (resp.headers.get("content-type")?.includes("application/json")) {
      const data = await resp.json();
      return res.json(data);
    }

    // Si devuelve HTML u otro tipo
    const text = await resp.text();
    res.send(text);

  } catch (error) {
    console.error("Error en proxy:", error);
    res.status(500).send("Error en proxy");
  }
});

// Proxy genérico (si necesitás más webhooks en n8n)
app.use("/n8n/*", async (req, res) => {
  try {
    const targetUrl = `${N8N_BASE}${req.originalUrl.replace("/n8n", "")}`;
    const resp = await fetch(targetUrl, { method: req.method, headers: req.headers });
    const body = await resp.text();
    res.status(resp.status).send(body);
  } catch (e) {
    res.status(500).send("Error en proxy genérico");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Proxy corriendo en puerto ${PORT}`));
