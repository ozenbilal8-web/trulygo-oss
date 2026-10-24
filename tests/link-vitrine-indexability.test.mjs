import assert from "node:assert/strict";
import test from "node:test";

import { isVitrineIndexable } from "../src/lib/link-vitrine-indexability.ts";

const BASE_VITRINE = {
  bio: "Ürünlerim ve sosyal profillerim.",
  displayName: "Ada Yılmaz",
  handle: "ada-yilmaz",
  isPublished: true,
  items: [],
};

const cases = [
  ["accepts a published profile with a meaningful bio", {}, true],
  ["rejects an unpublished profile", { isPublished: false }, false],
  ["rejects an uppercase handle", { handle: "Ada-Yilmaz" }, false],
  ["rejects a handle that is not normalized", { handle: "ada--yilmaz" }, false],
  ["rejects a handle shorter than the existing minimum", { handle: "ab" }, false],
  ["rejects a missing display name", { displayName: "   " }, false],
  [
    "rejects only the known auto-generated display-name placeholder",
    { displayName: "  TrulyGo   Kullanıcısı  " },
    false,
  ],
  [
    "does not reject a real name that merely contains the placeholder words",
    { displayName: "TrulyGo Kullanıcısı Topluluğu" },
    true,
  ],
  ["allows the display name to equal the handle", { displayName: "ada-yilmaz" }, true],
  ["rejects an otherwise empty profile", { bio: "\n\t", items: [] }, false],
  [
    "accepts one active HTTPS link without requiring a bio",
    { bio: null, items: [{ isActive: true, url: "https://example.com/profile" }] },
    true,
  ],
  [
    "accepts one active HTTP link without requiring two links",
    { bio: null, items: [{ isActive: true, url: "http://example.com/profile" }] },
    true,
  ],
  [
    "rejects an inactive public link",
    { bio: null, items: [{ isActive: false, url: "https://example.com/profile" }] },
    false,
  ],
  [
    "rejects a non-HTTP link",
    { bio: null, items: [{ isActive: true, url: "javascript:alert(1)" }] },
    false,
  ],
  [
    "rejects a malformed URL",
    { bio: null, items: [{ isActive: true, url: "not-a-url" }] },
    false,
  ],
];

for (const [name, overrides, expected] of cases) {
  test(name, () => {
    assert.equal(isVitrineIndexable({ ...BASE_VITRINE, ...overrides }), expected);
  });
}
