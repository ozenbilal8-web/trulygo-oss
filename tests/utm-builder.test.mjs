import assert from "node:assert/strict";
import test from "node:test";

import { buildUtmUrl } from "../src/lib/utm-builder.ts";

const BASE_INPUT = {
  destinationUrl: "https://site.com/urun",
  utmSource: "instagram",
  utmMedium: "social",
  utmCampaign: "yaz-kampanyasi",
  utmContent: "",
  utmTerm: "",
};

function build(overrides = {}) {
  return buildUtmUrl({ ...BASE_INPUT, ...overrides });
}

function expectSuccess(result) {
  assert.equal(result.ok, true);
  return result;
}

test("builds a basic UTM URL", () => {
  const result = expectSuccess(build());
  const url = new URL(result.generatedUrl);

  assert.equal(result.destinationUrl, "https://site.com/urun");
  assert.equal(url.origin + url.pathname, "https://site.com/urun");
  assert.equal(url.searchParams.get("utm_source"), "instagram");
  assert.equal(url.searchParams.get("utm_medium"), "social");
  assert.equal(url.searchParams.get("utm_campaign"), "yaz-kampanyasi");
  assert.equal(url.searchParams.has("utm_content"), false);
  assert.equal(url.searchParams.has("utm_term"), false);
});

test("preserves non-UTM query parameters", () => {
  const result = expectSuccess(
    build({ destinationUrl: "https://site.com/urun?ref=homepage&variant=green" }),
  );
  const url = new URL(result.generatedUrl);

  assert.equal(url.searchParams.get("ref"), "homepage");
  assert.equal(url.searchParams.get("variant"), "green");
});

test("replaces existing UTM values and collapses duplicates", () => {
  const result = expectSuccess(
    build({
      destinationUrl:
        "https://site.com/urun?utm_source=old&utm_source=older&utm_medium=email&utm_campaign=onceki&UTM_Content=legacy&ref=kept",
      utmContent: "hikaye-buton",
    }),
  );
  const url = new URL(result.generatedUrl);

  assert.deepEqual(url.searchParams.getAll("utm_source"), ["instagram"]);
  assert.equal(url.searchParams.get("utm_medium"), "social");
  assert.equal(url.searchParams.get("utm_campaign"), "yaz-kampanyasi");
  assert.equal(url.searchParams.get("utm_content"), "hikaye-buton");
  assert.equal(url.searchParams.has("UTM_Content"), false);
  assert.equal(url.searchParams.get("ref"), "kept");
});

test("preserves the URL fragment after query parameters", () => {
  const result = expectSuccess(
    build({ destinationUrl: "https://site.com/urun?ref=hero#detaylar" }),
  );
  const url = new URL(result.generatedUrl);

  assert.equal(url.hash, "#detaylar");
  assert.match(result.generatedUrl, /\?[^#]+#detaylar$/);
});

test("encodes Turkish characters and spaces with the URL API", () => {
  const result = expectSuccess(
    build({
      utmSource: "içerik ortağı",
      utmCampaign: "yaz fırsatları",
      utmTerm: "oyuncu bilgisayarı",
    }),
  );
  const url = new URL(result.generatedUrl);

  assert.equal(url.searchParams.get("utm_source"), "içerik ortağı");
  assert.equal(url.searchParams.get("utm_campaign"), "yaz fırsatları");
  assert.equal(url.searchParams.get("utm_term"), "oyuncu bilgisayarı");
  assert.match(result.generatedUrl, /%C4%B1|%C3%A7|%C5%9F/i);
});

test("adds populated optional values and removes empty optional UTM values", () => {
  const populated = expectSuccess(
    build({ utmContent: "hikaye-buton", utmTerm: "oyuncu-bilgisayari" }),
  );
  const populatedUrl = new URL(populated.generatedUrl);

  assert.equal(populatedUrl.searchParams.get("utm_content"), "hikaye-buton");
  assert.equal(populatedUrl.searchParams.get("utm_term"), "oyuncu-bilgisayari");

  const emptied = expectSuccess(
    build({
      destinationUrl: "https://site.com/urun?utm_content=legacy&utm_term=legacy&keep=1",
      utmContent: " ",
      utmTerm: null,
    }),
  );
  const emptiedUrl = new URL(emptied.generatedUrl);

  assert.equal(emptiedUrl.searchParams.has("utm_content"), false);
  assert.equal(emptiedUrl.searchParams.has("utm_term"), false);
  assert.equal(emptiedUrl.searchParams.get("keep"), "1");
});

for (const protocol of ["javascript:alert(1)", "data:text/html,hello", "file:///tmp/test"]) {
  test(`rejects ${protocol.split(":", 1)[0]} URLs`, () => {
    assert.deepEqual(build({ destinationUrl: protocol }), {
      ok: false,
      field: "destinationUrl",
      code: "unsupported_protocol",
    });
  });
}

test("rejects malformed and credential-bearing URLs", () => {
  assert.deepEqual(build({ destinationUrl: "not a valid url" }), {
    ok: false,
    field: "destinationUrl",
    code: "invalid_url",
  });
  assert.deepEqual(build({ destinationUrl: "https://user:secret@site.com/urun" }), {
    ok: false,
    field: "destinationUrl",
    code: "credentials_not_allowed",
  });
});

for (const malformedUrl of ["http:\\example.com", "https:\\\\example.com"]) {
  test(`rejects a backslash URL variant: ${malformedUrl}`, () => {
    assert.deepEqual(build({ destinationUrl: malformedUrl }), {
      ok: false,
      field: "destinationUrl",
      code: "invalid_url",
    });
  });
}

test("adds https to a domain-like protocol-less URL", () => {
  const result = expectSuccess(
    build({ destinationUrl: "site.com/urun?ref=organic#ozellikler" }),
  );

  assert.equal(result.destinationUrl, "https://site.com/urun?ref=organic#ozellikler");
  assert.equal(new URL(result.generatedUrl).protocol, "https:");
  assert.equal(new URL(result.generatedUrl).hash, "#ozellikler");
});

for (const [field, overrides] of [
  ["destinationUrl", { destinationUrl: "   " }],
  ["utmSource", { utmSource: "" }],
  ["utmMedium", { utmMedium: "\t" }],
  ["utmCampaign", { utmCampaign: "  " }],
]) {
  test(`rejects an empty required ${field}`, () => {
    assert.deepEqual(build(overrides), {
      ok: false,
      field,
      code: "required",
    });
  });
}
