import test from "node:test";
import assert from "node:assert/strict";
import { appendUtmParams } from "../src/lib/click-event-utm.ts";

const instagramChannelUtm = {
  utm_source: "instagram",
  utm_medium: "social",
  utm_campaign: "test",
  utm_content: "instagram",
  utm_term: null,
};

const overwriteChannelUtm = { overwriteExisting: true };

test("replaces stale YouTube UTM values with Instagram channel values", () => {
  const result = appendUtmParams(
    "https://site.com/?utm_source=youtube&utm_medium=video&utm_campaign=test&utm_content=youtube",
    instagramChannelUtm,
    overwriteChannelUtm,
  );
  const url = new URL(result);

  assert.equal(url.searchParams.get("utm_source"), "instagram");
  assert.equal(url.searchParams.get("utm_medium"), "social");
  assert.equal(url.searchParams.get("utm_campaign"), "test");
  assert.equal(url.searchParams.get("utm_content"), "instagram");
});

test("collapses duplicate UTM values to one standard key", () => {
  const result = appendUtmParams(
    "https://site.com/?utm_source=youtube&utm_source=email&UTM_SOURCE=qr&utm_medium=video&utm_medium=email&utm_campaign=old&utm_content=old",
    instagramChannelUtm,
    overwriteChannelUtm,
  );
  const url = new URL(result);

  assert.deepEqual(url.searchParams.getAll("utm_source"), ["instagram"]);
  assert.deepEqual(url.searchParams.getAll("utm_medium"), ["social"]);
  assert.deepEqual(url.searchParams.getAll("utm_campaign"), ["test"]);
  assert.deepEqual(url.searchParams.getAll("utm_content"), ["instagram"]);
});

test("removes case variants and leaves only lowercase UTM keys", () => {
  const result = appendUtmParams(
    "https://site.com/?UTM_SOURCE=youtube&Utm_Medium=video&UTM_CAMPAIGN=old&uTm_CoNtEnT=old&UTM_TERM=oyuncu",
    instagramChannelUtm,
    overwriteChannelUtm,
  );
  const url = new URL(result);
  const resultingUtmKeys = Array.from(url.searchParams.keys()).filter((key) =>
    key.toLowerCase().startsWith("utm_"),
  );

  assert.deepEqual(resultingUtmKeys, [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ]);
});

test("preserves non-UTM query parameters", () => {
  const result = appendUtmParams(
    "https://site.com/product?ref=homepage&coupon=summer&utm_source=youtube",
    instagramChannelUtm,
    overwriteChannelUtm,
  );
  const url = new URL(result);

  assert.equal(url.searchParams.get("ref"), "homepage");
  assert.equal(url.searchParams.get("coupon"), "summer");
});

test("preserves the URL fragment", () => {
  const result = appendUtmParams(
    "https://site.com/product?utm_source=youtube#pricing",
    instagramChannelUtm,
    overwriteChannelUtm,
  );

  assert.equal(new URL(result).hash, "#pricing");
});

test("preserves an existing utm_term while standardizing its key", () => {
  const result = appendUtmParams(
    "https://site.com/?UTM_TERM=oyuncu+bilgisayari&utm_term=ikinci",
    instagramChannelUtm,
    overwriteChannelUtm,
  );
  const url = new URL(result);

  assert.deepEqual(url.searchParams.getAll("utm_term"), ["oyuncu bilgisayari"]);
  assert.equal(Array.from(url.searchParams.keys()).includes("UTM_TERM"), false);
});

test("adds channel UTM values when the target has no UTM parameters", () => {
  const result = appendUtmParams(
    "https://site.com/product?ref=homepage#details",
    instagramChannelUtm,
    overwriteChannelUtm,
  );
  const url = new URL(result);

  assert.equal(url.searchParams.get("utm_source"), "instagram");
  assert.equal(url.searchParams.get("utm_medium"), "social");
  assert.equal(url.searchParams.get("utm_campaign"), "test");
  assert.equal(url.searchParams.get("utm_content"), "instagram");
  assert.equal(url.searchParams.has("utm_term"), false);
});

test("keeps the existing main-link append behavior by default", () => {
  const result = appendUtmParams(
    "https://site.com/?utm_source=youtube&utm_medium=video&utm_campaign=original&utm_content=youtube&ref=kept#watch",
    {
      ...instagramChannelUtm,
      utm_term: "oyuncu",
    },
  );
  const url = new URL(result);

  assert.equal(url.searchParams.get("utm_source"), "youtube");
  assert.equal(url.searchParams.get("utm_medium"), "video");
  assert.equal(url.searchParams.get("utm_campaign"), "original");
  assert.equal(url.searchParams.get("utm_content"), "youtube");
  assert.equal(url.searchParams.get("utm_term"), "oyuncu");
  assert.equal(url.searchParams.get("ref"), "kept");
  assert.equal(url.hash, "#watch");
});
