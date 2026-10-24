import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_UTM_DRAFT_STORAGE_KEY,
  PUBLIC_UTM_DRAFT_TTL_MS,
  consumePublicUtmDraft,
  readPublicUtmDraft,
  savePublicUtmDraft,
} from "../src/lib/public-utm-draft.ts";

const NOW = Date.UTC(2026, 6, 15, 9, 0, 0);
const VALID_INPUT = {
  generatedUrl:
    "https://site.com/urun?ref=home&utm_source=instagram&utm_medium=social&utm_campaign=yaz",
  destinationUrl: "https://site.com/urun?ref=home",
  utmSource: "instagram",
  utmMedium: "social",
  utmCampaign: "yaz",
  utmContent: null,
  utmTerm: null,
};

class MemoryStorage {
  #items = new Map();

  getItem(key) {
    return this.#items.get(key) ?? null;
  }

  setItem(key, value) {
    this.#items.set(key, String(value));
  }

  removeItem(key) {
    this.#items.delete(key);
  }
}

function storedDraft(overrides = {}) {
  return {
    ...VALID_INPUT,
    createdAt: NOW,
    version: 1,
    ...overrides,
  };
}

test("saves and reads only the versioned public UTM draft fields", () => {
  const storage = new MemoryStorage();

  assert.equal(savePublicUtmDraft(storage, VALID_INPUT, NOW), true);
  assert.deepEqual(readPublicUtmDraft(storage, NOW + 1), storedDraft());

  const serialized = storage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY);
  assert.ok(serialized);
  assert.deepEqual(Object.keys(JSON.parse(serialized)).sort(), [
    "createdAt",
    "destinationUrl",
    "generatedUrl",
    "utmCampaign",
    "utmContent",
    "utmMedium",
    "utmSource",
    "utmTerm",
    "version",
  ]);
});

test("expires and removes a draft at the two-hour TTL", () => {
  const storage = new MemoryStorage();
  savePublicUtmDraft(storage, VALID_INPUT, NOW);

  assert.equal(readPublicUtmDraft(storage, NOW + PUBLIC_UTM_DRAFT_TTL_MS), null);
  assert.equal(storage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY), null);
});

test("ignores and removes malformed JSON", () => {
  const storage = new MemoryStorage();
  storage.setItem(PUBLIC_UTM_DRAFT_STORAGE_KEY, "{broken-json");

  assert.equal(readPublicUtmDraft(storage, NOW), null);
  assert.equal(storage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY), null);
});

test("ignores and removes an old draft version", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    PUBLIC_UTM_DRAFT_STORAGE_KEY,
    JSON.stringify(storedDraft({ version: 0 })),
  );

  assert.equal(readPublicUtmDraft(storage, NOW), null);
  assert.equal(storage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY), null);
});

test("rejects unsafe URLs on save and read", () => {
  const saveStorage = new MemoryStorage();
  assert.equal(
    savePublicUtmDraft(
      saveStorage,
      { ...VALID_INPUT, generatedUrl: "javascript:alert(1)" },
      NOW,
    ),
    false,
  );
  assert.equal(saveStorage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY), null);

  const readStorage = new MemoryStorage();
  readStorage.setItem(
    PUBLIC_UTM_DRAFT_STORAGE_KEY,
    JSON.stringify(storedDraft({ destinationUrl: "data:text/html,hello" })),
  );
  assert.equal(readPublicUtmDraft(readStorage, NOW), null);
  assert.equal(readStorage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY), null);
});

test("rejects a future-dated draft so its TTL cannot be bypassed", () => {
  const storage = new MemoryStorage();
  storage.setItem(
    PUBLIC_UTM_DRAFT_STORAGE_KEY,
    JSON.stringify(storedDraft({ createdAt: NOW + 1 })),
  );

  assert.equal(readPublicUtmDraft(storage, NOW), null);
  assert.equal(storage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY), null);
});

test("consumes a valid draft exactly once and removes it", () => {
  const storage = new MemoryStorage();
  savePublicUtmDraft(storage, VALID_INPUT, NOW);

  assert.deepEqual(consumePublicUtmDraft(storage, NOW + 1), storedDraft());
  assert.equal(storage.getItem(PUBLIC_UTM_DRAFT_STORAGE_KEY), null);
  assert.equal(consumePublicUtmDraft(storage, NOW + 2), null);
});

test("fails safely when session storage access is blocked", () => {
  const blockedStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };

  assert.equal(savePublicUtmDraft(blockedStorage, VALID_INPUT, NOW), false);
  assert.equal(readPublicUtmDraft(blockedStorage, NOW), null);
  assert.equal(consumePublicUtmDraft(blockedStorage, NOW), null);
});
