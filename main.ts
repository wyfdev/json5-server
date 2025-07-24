import { serve, ConnInfo } from "https://deno.land/std@0.140.0/http/server.ts";
import JSON5 from "json5";
import { join } from "https://deno.land/std@0.140.0/path/mod.ts";
import { parseArgs } from "std/cli";

const DEFAULT_PORT = 8000;
const DEFAULT_HOST = "localhost";
const DEFAULT_DIR = ".";

const flags = parseArgs(Deno.args, {
  string: ["host", "port", "dir"],
  boolean: ["help"],
  alias: { h: "help" },
  default: {
    port: DEFAULT_PORT,
    host: DEFAULT_HOST,
    dir: DEFAULT_DIR,
  },
});

if (flags.help) {
  console.log(`JSON5 Server
    
Usage:
  json5-server [options]

Options:
  --host <hostname>   Host to listen on (default: ${DEFAULT_HOST})
  --port <port>       Port to listen on (default: ${DEFAULT_PORT})
  --dir <path>        Directory to serve files from (default: current directory)
  -h, --help          Print this help message
  `);
  Deno.exit(0);
}

export async function handler(req: Request, serveDir: string): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

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
