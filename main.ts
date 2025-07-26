import { serve, ConnInfo } from "https://deno.land/std@0.140.0/http/server.ts";
import JSON5 from "json5";
import { join } from "https://deno.land/std@0.140.0/path/mod.ts";
import { parseArgs } from "std/cli";
import denoJson from "./deno.json" with { type: "json" };

const DEFAULT_PORT = 8000;
const DEFAULT_HOST = "localhost";
const DEFAULT_DIR = ".";

const flags = parseArgs(Deno.args, {
  string: ["host", "port", "dir"],
  boolean: ["help", "version"],
  alias: { h: "help", v: "version" },
  default: {
    port: DEFAULT_PORT,
    host: DEFAULT_HOST,
    dir: DEFAULT_DIR,
  },
});

if (flags.help) {
  console.log(`JSON5 Server ${denoJson.version}
    
Usage:
  json5-server [options]

Options:
  --host <hostname>   Host to listen on (default: ${DEFAULT_HOST})
  --port <port>       Port to listen on (default: ${DEFAULT_PORT})
  --dir <path>        Directory to serve files from (default: current directory)
  -h, --help          Print this help message
  -v, --version       Print version information
  `);
  Deno.exit(0);
}

if (flags.version) {
  console.log(denoJson.version);
  Deno.exit(0);
}

function jsonToHtml(data: any, indentLevel = 0, createLinks = true): string {
  const indent = '  '.repeat(indentLevel);
  const nextIndent = '  '.repeat(indentLevel + 1);

  if (data === null) {
    return '<span class="json-null">null</span>';
  }

  switch (typeof data) {
    case 'string':
      return createLinks ? `<a href="${data}"><span class="json-string">"${data}"</span></a>` : `<span class="json-string">"${data}"</span>`;
    case 'number':
      return createLinks ? `<a href="${String(data)}"><span class="json-number">${String(data)}</span></a>` : `<span class="json-number">${String(data)}</span>`;
    case 'boolean':
      return createLinks ? `<a href="${String(data)}"><span class="json-boolean">${String(data)}</span></a>` : `<span class="json-boolean">${String(data)}</span>`;
    case 'object':
      if (Array.isArray(data)) {
        if (data.length === 0) {
          return '[]';
        }
        const items = data
          .map(item => `${nextIndent}${jsonToHtml(item, indentLevel + 1, createLinks)}`)
          .join(',\n');
        return `[\n${items}\n${indent}]`;
      }
      if (data !== null) {
        const entries = Object.entries(data);
        if (entries.length === 0) {
          return '{}';
        }
        const items = entries
          .map(([key, value]) => `${nextIndent}<span class="json-key">"${key}"</span>: ${jsonToHtml(value, indentLevel + 1, createLinks)}`)
          .join(',\n');
        return `{\n${items}\n${indent}}`;
      }
      return '<span class="json-null">null</span>';
    default:
      return `<span class="json-string">"${String(data)}"</span>`;
  }
}

export async function handler(req: Request, serveDir: string): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  const commonStyles = `
    :root {
      --background-color: #ffffff;
      --text-color: #333333;
      --key-color: #a31515;
      --string-color: #0451a5;
      --number-color: #098658;
      --boolean-color: #0000ff;
      --null-color: #0000ff;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --background-color: #1e1e1e;
        --text-color: #d4d4d4;
        --key-color: #9cdcfe;
        --string-color: #ce9178;
        --number-color: #b5cea8;
        --boolean-color: #569cd6;
        --null-color: #569cd6;
      }
    }

    body {
      font-family: monospace;
      white-space: pre;
      background-color: var(--background-color);
      color: var(--text-color);
      margin: 0;
      padding: 1em;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .json-key {
      color: var(--key-color);
    }
    .json-string {
      color: var(--string-color);
    }
    .json-number {
      color: var(--number-color);
    }
    .json-boolean {
      color: var(--boolean-color);
    }
    .json-null {
      color: var(--null-color);
    }
  `;

  if (pathname === "/") {
    try {
      const files = [];
      for await (const dirEntry of Deno.readDir(serveDir)) {
        if (
          dirEntry.isFile &&
          (dirEntry.name.endsWith(".json5") || dirEntry.name.endsWith(".json"))
        ) {
          files.push(dirEntry.name);
        }
      }

      if (req.headers.get("accept")?.includes("text/html")) {
        const fileLinks = files.map(file => `  <a href="/${file}"><span class="json-string">"${file}"</span></a>`).join(',\n');
        const htmlBody = `[\n${fileLinks}\n]`;
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>JSON/JSON5 Files</title>
              <style>${commonStyles}</style>
            </head>
            <body>${htmlBody}</body>
          </html>
        `;
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      const jsonString = JSON.stringify(files, null, 2);
      return new Response(jsonString, {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  const filePath = join(serveDir, pathname);

  try {
    const fileContent = await Deno.readTextFile(filePath);
    const jsonData = JSON5.parse(fileContent);

    if (req.headers.get("accept")?.includes("text/html")) {
      const htmlBody = jsonToHtml(jsonData, 0, false);
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${pathname}</title>
            <style>${commonStyles}</style>
          </head>
          <body>${htmlBody}</body>
        </html>
      `;
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const jsonString = JSON.stringify(jsonData, null, 2);

    return new Response(jsonString, {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return new Response("Not Found", { status: 404 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

function logAccess(req: Request, connInfo: ConnInfo, res: Response, start: number) {
  const remoteAddr = connInfo.remoteAddr as Deno.NetAddr;
  console.log(
    `${remoteAddr.hostname} - [${new Date().toISOString()}] "${req.method} ${
      req.url
    } HTTP/1.1" ${res.status} ${res.headers.get("content-length") || "-"} ${
      Date.now() - start
    }ms`
  );
}

if (import.meta.main) {
  const port = Number(flags.port);
  const serveDir = join(Deno.cwd(), flags.dir);
  serve(
    async (req, connInfo) => {
      const start = Date.now();
      const res = await handler(req, serveDir);
      logAccess(req, connInfo, res, start);
      return res;
    },
    { port, hostname: flags.host }
  );
  console.log(`Server running on http://${flags.host}:${port}/`);
  console.log(`Serving JSON5 files from: ${serveDir}`);
}
