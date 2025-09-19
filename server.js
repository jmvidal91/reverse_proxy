import express from "express";
import fetch from "node-fetch";

const app = express();

// Bases de tus flujos en n8n
const URLS = {
  qr: "https://n8n-railway-production-2eac.up.railway.app/webhook/a4c766df-0e23-4b54-925f-2d25af02d024/qr",
  wl_esperas: "https://n8n-railway-production-2eac.up.railway.app/webhook/2d4f1b37-c818-460d-8277-3596603fa484/monitor-pedidos",
  db_turnos: "https://n8n-railway-production-2eac.up.railway.app/webhook/a5afc7b2-5131-4fdd-8425-492551de3a37/db_turnos",
  wl_turnos: "https://n8n-railway-production-2eac.up.railway.app/webhook/df0a82f5-cb1b-4a36-93d2-e1e06f396cb3/lista-espera",
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

// QR → /qr/:cajeroId
app.get("/qr/:cajeroId", (req, res) => {
  proxyRequest(URLS.qr, req.params.cajeroId, res);
});

// WL Esperas → /wl_esperas/:cuenta_codigo
app.get("/wl_esperas/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.wl_esperas, req.params.cuentaCodigo, res);
});

// DB Turnos → /db_turnos/:cuenta_codigo
app.get("/db_turnos/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.db_turnos, req.params.cuentaCodigo, res);
});

// WL Turnos → /wl_turnos/:cuenta_codigo
app.get("/wl_turnos/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.wl_turnos, req.params.cuentaCodigo, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Proxy escuchando en puerto ${PORT}`));
