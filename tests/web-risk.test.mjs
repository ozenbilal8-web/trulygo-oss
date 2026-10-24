import assert from "node:assert/strict";
import test from "node:test";

import { checkUrlWithWebRiskCore } from "../src/lib/web-risk-core.ts";

const TARGET_URL = "https://example.com/path";
const API_KEY = "test-api-key";
const CHECKED_AT = "2026-07-11T08:00:00.000Z";

function responseWithJson(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function runWithFetch(fetchImpl, overrides = {}) {
  return checkUrlWithWebRiskCore(TARGET_URL, {
    apiKey: API_KEY,
    fetchImpl,
    timeoutMs: 100,
    now: () => new Date(CHECKED_AT),
    onFailure: () => undefined,
    ...overrides,
  });
}

function runWithJson(value) {
  return runWithFetch(async () => responseWithJson(value));
}

test("classifies only an empty object as clean", async () => {
  const result = await runWithJson({});
  assert.deepEqual(result, {
    status: "clean",
    threats: [],
    checkedAt: CHECKED_AT,
  });
});

test("classifies a valid recognized threat response as flagged", async () => {
  const result = await runWithJson({
    threat: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "MALWARE"],
      expireTime: "2026-07-11T09:00:00Z",
    },
  });
  assert.deepEqual(result, {
    status: "flagged",
    threats: ["MALWARE", "SOCIAL_ENGINEERING"],
    checkedAt: CHECKED_AT,
  });
});

test("classifies null as error", async () => {
  assert.equal((await runWithJson(null)).status, "error");
});

test("classifies an array as error", async () => {
  assert.equal((await runWithJson([])).status, "error");
});

test("classifies scalar JSON as error", async () => {
  assert.equal((await runWithJson("clean")).status, "error");
});

test("classifies missing, malformed, or unexpected threat objects as error", async () => {
  const bodies = [
    { unexpected: true },
    { threat: null },
    { threat: {} },
    { threat: { threatTypes: [], unexpected: true } },
  ];

  for (const body of bodies) {
    assert.equal((await runWithJson(body)).status, "error");
  }
});

test("classifies non-array threatTypes as error", async () => {
  const result = await runWithJson({ threat: { threatTypes: "MALWARE" } });
  assert.equal(result.status, "error");
});

test("classifies unknown threatTypes as error", async () => {
  const result = await runWithJson({
    threat: { threatTypes: ["UNKNOWN_THREAT_TYPE"] },
  });
  assert.equal(result.status, "error");
});

test("classifies invalid JSON as error", async () => {
  const result = await runWithFetch(
    async () =>
      new Response("{not-valid-json", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
  assert.equal(result.status, "error");
});

test("classifies non-2xx responses as error", async () => {
  const result = await runWithFetch(async () => responseWithJson({}, 503));
  assert.equal(result.status, "error");
});

test("classifies timeouts as error", async () => {
  const fetchImpl = (_input, init) =>
    new Promise((_resolve, reject) => {
      const abort = () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      };

      if (init?.signal?.aborted) {
        abort();
        return;
      }

      init?.signal?.addEventListener("abort", abort, { once: true });
    });

  const result = await runWithFetch(fetchImpl, { timeoutMs: 5 });
  assert.equal(result.status, "error");
});
