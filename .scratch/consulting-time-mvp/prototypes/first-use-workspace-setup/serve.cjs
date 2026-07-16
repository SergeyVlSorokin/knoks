// THROWAWAY PROTOTYPE launcher: node serve.cjs
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "index.html"));

http.createServer((request, response) => {
  if (request.url === "/" || request.url.startsWith("/?") || request.url === "/index.html") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }
  response.writeHead(404);
  response.end("Not found");
}).listen(4174, () => console.log("First-use setup prototype: http://localhost:4174/?variant=A"));
