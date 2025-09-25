import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Necesario para armar __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bases de tus flujos en n8n
const URLS = {
  qr: "https://n8n-railway-production-2eac.up.railway.app/webhook/a4c766df-0e23-4b54-925f-2d25af02d024/qr",
  wl_esperas: "https://n8n-railway-production-2eac.up.railway.app/webhook/2d4f1b37-c818-460d-8277-3596603fa484/monitor-pedidos",
  db_turnos: "https://n8n-railway-production-2eac.up.railway.app/webhook/a5afc7b2-5131-4fdd-8425-492551de3a37/db_turnos",
  wl_turnos: "https://n8n-railway-production-2eac.up.railway.app/webhook/df0a82f5-cb1b-4a36-93d2-e1e06f396cb3/lista-espera",
  refresh_turnos: "https://n8n-railway-production-2eac.up.railway.app/webhook/a5afc7b2-5131-4fdd-8425-492551de3a37/refresh_turnos",
};

// Helper genérico
async function proxyRequest(baseUrl, id, res) {
  try {
    const url = `${baseUrl}/${id}`;
    const resp = await fetch(url);
    const contentType = resp.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await resp.json();
      return res.json(data);
    }

    const text = await resp.text();
    res.status(resp.status).send(text);
  } catch (err) {
    console.error("Error en proxy:", err);
    res.status(500).send("Error en proxy");
  }
}

// === Rutas proxy ===

// QR → /qr/:cajeroId
app.get("/qr/:cajeroId", (req, res) => {
  proxyRequest(URLS.qr, req.params.cajeroId, res);
});

// WL Esperas → /wl_esperas/:cuentaCodigo
app.get("/wl_esperas/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.wl_esperas, req.params.cuentaCodigo, res);
});

// DB Turnos → /db_turnos/:cuentaCodigo
// 👉 acá inyectamos el cuentaCodigo dentro del HTML antes de enviarlo
app.get("/db_turnos/:cuentaCodigo", async (req, res) => {
  const { cuentaCodigo } = req.params;
  try {
    const resp = await fetch(`${URLS.db_turnos}/${cuentaCodigo}`);
    let html = await resp.text();

    // Inyectar variable global en el <head>
    html = html.replace(
      "</head>",
      `<script>window.CUENTA_CODIGO="${cuentaCodigo}"</script></head>`
    );

    res.send(html);
  } catch (err) {
    console.error("Error en proxy db_turnos:", err);
    res.status(500).send("Error en proxy db_turnos");
  }
});

// WL Turnos → /wl_turnos/:cuentaCodigo
app.get("/wl_turnos/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.wl_turnos, req.params.cuentaCodigo, res);
});

// WH refresh_turnos → /refresh_turnos/:cuentaCodigo
app.get("/refresh_turnos/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.refresh_turnos, req.params.cuentaCodigo, res);
});

// === Favicon ===
// si acceden a /favicon.ico → sirve tu logo local
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "favicon.png"));
});

// Arranque del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Proxy escuchando en puerto ${PORT}`));
