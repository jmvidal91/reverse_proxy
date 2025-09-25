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

// util para escapar el id en JS
function jsEscape(str = "") {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/</g, "\\u003C");
}

function injectCuentaCodigo(html, id) {
  const safeId = jsEscape(id);
  const payload =
    `<script>(function(){` +
    `try{window.CUENTA_CODIGO=\`${safeId}\`;` +
    `console.log("[proxy] CUENTA_CODIGO =", window.CUENTA_CODIGO);}catch(e){` +
    `console.error("[proxy] error inyectando CUENTA_CODIGO", e);}})();</script>`;

  // 1) antes de </head> (case-insens.)
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, payload + "</head>");
  }
  // 2) antes de <body>
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => m + payload);
  }
  // 3) si no hay head/body, prepend
  return payload + html;
}

async function proxyRequest(baseUrl, id, res) {
  try {
    const url = `${baseUrl}/${encodeURIComponent(id)}`;
    const resp = await fetch(url);
    const contentType = resp.headers.get("content-type") || "";

    // reenviamos el mismo status
    res.status(resp.status);

    if (contentType.includes("application/json")) {
      res.set("Content-Type", contentType);
      const data = await resp.json();
      return res.json(data);
    }

    const text = await resp.text();

    if (contentType.includes("text/html")) {
      const withVar = injectCuentaCodigo(text, id);
      res.set("Content-Type", contentType);
      return res.send(withVar);
    }

    // otros tipos (texto, etc.)
    res.set("Content-Type", contentType || "text/plain; charset=utf-8");
    return res.send(text);
  } catch (err) {
    console.error("Error en proxy:", err);
    res.status(500).send("Error en proxy");
  }
}

// === Rutas proxy ===
app.get("/qr/:cajeroId", (req, res) => {
  proxyRequest(URLS.qr, req.params.cajeroId, res);
});

app.get("/wl_esperas/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.wl_esperas, req.params.cuentaCodigo, res);
});

app.get("/db_turnos/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.db_turnos, req.params.cuentaCodigo, res);
});

app.get("/wl_turnos/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.wl_turnos, req.params.cuentaCodigo, res);
});

app.get("/refresh_turnos/:cuentaCodigo", (req, res) => {
  proxyRequest(URLS.refresh_turnos, req.params.cuentaCodigo, res);
});

// favicon
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "favicon.png"));
});

// Arranque
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Proxy escuchando en puerto ${PORT}`));
