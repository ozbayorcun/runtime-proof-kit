import http from "node:http";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Runtime Proof Kit Example</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111827;
        background: #f8fafc;
      }

      main {
        width: min(680px, calc(100vw - 48px));
      }

      h1 {
        margin: 0 0 12px;
        font-size: 40px;
        line-height: 1;
      }

      p {
        margin: 0;
        font-size: 18px;
        line-height: 1.5;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Runtime Proof Kit</h1>
      <p>This example page exists so the CLI can prove a local app started, rendered, and contained expected text.</p>
    </main>
  </body>
</html>`;

const server = http.createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  response.end(html);
});

server.listen(4173, "127.0.0.1", () => {
  console.log("Example server listening on http://127.0.0.1:4173");
});
