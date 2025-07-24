import { assertEquals, assertArrayIncludes } from "@std/assert";
import { handler } from "./main.ts";
import { join } from "https://deno.land/std@0.140.0/path/mod.ts";

const dataDir = join(Deno.cwd(), "data");

Deno.test("Handler test - success (.json5)", async () => {
  const req = new Request("http://localhost:8000/example.json5");
  const res = await handler(req, dataDir);
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "application/json; charset=utf-8");
  assertEquals(json.name, "John Doe");
  assertEquals(json.age, 30);
});

Deno.test("Handler test - success (.json)", async () => {
  const req = new Request("http://localhost:8000/example.json");
  const res = await handler(req, dataDir);
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "application/json; charset=utf-8");
  assertEquals(json.city, "New York");
  assertEquals(json.population, 8419000);
});

Deno.test("Handler test - not found", async () => {
  const req = new Request("http://localhost:8000/non-existent-file.json5");
  const res = await handler(req, dataDir);

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not Found");
});

Deno.test("Handler test - root path", async () => {
  const req = new Request("http://localhost:8000/");
  const res = await handler(req, dataDir);
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "application/json; charset=utf-8");
  assertArrayIncludes(json, ["example.json5", "example.json"]);
});
