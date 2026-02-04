const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 8000;

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const serveStatic = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.join(__dirname, path.normalize(filePath));

  if (!safePath.startsWith(__dirname)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const ext = path.extname(safePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
};

const proxyRequest = (req, res) => {
  const targetIp = req.headers["x-tv-ip"];
  const targetPort = req.headers["x-tv-port"] || "1925";

  if (!targetIp) {
    sendJson(res, 400, { error: "Missing X-TV-IP header." });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetPath = url.pathname.replace(/^\/api/, "");

  const options = {
    host: targetIp,
    port: targetPort,
    path: targetPath + url.search,
    method: req.method,
    headers: {
      "Content-Type": req.headers["content-type"] || "application/json",
      "Accept": "application/json"
    }
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, {
      "Content-Type": proxyRes.headers["content-type"] || "application/json",
      "Access-Control-Allow-Origin": "*"
    });
    proxyRes.pipe(res);
  });

  proxy.on("error", (error) => {
    sendJson(res, 502, { error: "Proxy error", detail: error.message });
  });

  req.pipe(proxy);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api")) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,X-TV-IP,X-TV-PORT"
      });
      res.end();
      return;
    }
    proxyRequest(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Remote control server running on http://localhost:${PORT}`);
});
