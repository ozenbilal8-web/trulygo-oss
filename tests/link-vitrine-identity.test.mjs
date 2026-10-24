import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLinkVitrineIdentitySameAs,
  normalizeLinkVitrineIdentityUrl,
} from "../src/lib/link-vitrine-identity.ts";

function item(platform, url, overrides = {}) {
  return {
    isActive: true,
    platform,
    url,
    ...overrides,
  };
}

const acceptedProfiles = [
  ["X profile", item("x", "https://x.com/gecerli_user"), "https://x.com/gecerli_user"],
  ["legacy Twitter profile", item("x", "https://twitter.com/gecerli"), "https://x.com/gecerli"],
  ["Instagram profile", item("instagram", "https://instagram.com/gecerli"), "https://instagram.com/gecerli"],
  ["LinkedIn person", item("linkedin", "https://linkedin.com/in/gecerli"), "https://linkedin.com/in/gecerli"],
  ["LinkedIn company", item("linkedin", "https://linkedin.com/company/gecerli"), "https://linkedin.com/company/gecerli"],
  ["LinkedIn school", item("linkedin", "https://linkedin.com/school/gecerli"), "https://linkedin.com/school/gecerli"],
  ["YouTube handle", item("youtube", "https://youtube.com/@gecerli"), "https://youtube.com/@gecerli"],
  [
    "YouTube channel id",
    item("youtube", "https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    "https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
  ],
  ["YouTube legacy user", item("youtube", "https://youtube.com/user/gecerli"), "https://youtube.com/user/gecerli"],
  ["YouTube custom channel", item("youtube", "https://youtube.com/c/gecerli"), "https://youtube.com/c/gecerli"],
  [
    "YouTube profile tab",
    item("youtube", "https://youtube.com/@gecerli/videos?view=0#section"),
    "https://youtube.com/@gecerli",
  ],
  ["Facebook username", item("facebook", "https://facebook.com/gecerli"), "https://facebook.com/gecerli"],
  [
    "Facebook numeric profile",
    item("facebook", "https://facebook.com/profile.php?id=123456"),
    "https://facebook.com/profile.php?id=123456",
  ],
  [
    "Facebook numeric profile with tracking",
    item(
      "facebook",
      "http://www.facebook.com/profile.php?id=123456&mibextid=abc&utm_source=test#bio",
    ),
    "https://facebook.com/profile.php?id=123456",
  ],
  [
    "Facebook people profile",
    item("facebook", "https://facebook.com/people/Valid-Name/123456"),
    "https://facebook.com/people/Valid-Name/123456",
  ],
  ["Twitch profile", item("twitch", "https://twitch.tv/gecerli"), "https://twitch.tv/gecerli"],
  ["GitHub profile", item("website", "https://github.com/gecerli"), "https://github.com/gecerli"],
  ["TikTok profile", item("tiktok", "https://tiktok.com/@gecerli"), "https://tiktok.com/@gecerli"],
  ["Kick profile", item("kick", "https://kick.com/gecerli"), "https://kick.com/gecerli"],
];

for (const [name, input, expected] of acceptedProfiles) {
  test(`accepts and normalizes ${name}`, () => {
    assert.equal(normalizeLinkVitrineIdentityUrl(input), expected);
  });
}

const rejectedUrls = [
  ["X login", item("x", "https://x.com/login")],
  ["X home", item("x", "https://x.com/home")],
  ["X intent", item("x", "https://x.com/intent/tweet")],
  ["X communities", item("x", "https://x.com/communities")],
  ["X premium", item("x", "https://x.com/premium")],
  ["X username longer than the platform limit", item("x", "https://x.com/abcdefghijklmnop")],
  ["Instagram account login", item("instagram", "https://instagram.com/accounts/login")],
  ["Instagram post", item("instagram", "https://instagram.com/p/abc")],
  ["Instagram directory", item("instagram", "https://instagram.com/directory")],
  ["LinkedIn login", item("linkedin", "https://linkedin.com/login")],
  ["LinkedIn jobs", item("linkedin", "https://linkedin.com/jobs")],
  ["YouTube watch", item("youtube", "https://youtube.com/watch?v=abc")],
  ["YouTube short", item("youtube", "https://youtube.com/shorts/abc")],
  ["Facebook login", item("facebook", "https://facebook.com/login")],
  ["Facebook group", item("facebook", "https://facebook.com/groups/abc")],
  ["Facebook pages root", item("facebook", "https://facebook.com/pages")],
  ["Facebook settings", item("facebook", "https://facebook.com/settings")],
  ["Facebook privacy", item("facebook", "https://facebook.com/privacy")],
  ["Facebook policies", item("facebook", "https://facebook.com/policies")],
  ["Twitch login", item("twitch", "https://twitch.tv/login")],
  ["Twitch directory", item("twitch", "https://twitch.tv/directory")],
  ["Twitch following", item("twitch", "https://twitch.tv/following")],
  ["Twitch team root", item("twitch", "https://twitch.tv/team")],
  ["Twitch redeem", item("twitch", "https://twitch.tv/redeem")],
  ["Twitch wallet", item("twitch", "https://twitch.tv/wallet")],
  ["Kick browse", item("kick", "https://kick.com/browse")],
  ["GitHub account", item("website", "https://github.com/account")],
  ["GitHub apps", item("website", "https://github.com/apps")],
  ["GitHub dashboard", item("website", "https://github.com/dashboard")],
  ["GitHub repository", item("website", "https://github.com/user/repository")],
  ["GitHub login", item("website", "https://github.com/login")],
  ["GitHub solutions", item("website", "https://github.com/solutions")],
  ["GitHub resources", item("website", "https://github.com/resources")],
  ["GitHub readme", item("website", "https://github.com/readme")],
  ["GitHub support", item("website", "https://github.com/support")],
  ["GitHub customer stories", item("website", "https://github.com/customer-stories")],
  ["unknown host", item("x", "https://example.com/gecerli")],
  ["unknown subdomain", item("x", "https://help.x.com/gecerli")],
  ["platform and host mismatch", item("x", "https://instagram.com/gecerli")],
  ["YouTube short host", item("youtube", "https://youtu.be/FKbfrhypDsE")],
  ["relative URL", item("x", "/gecerli")],
  ["JavaScript URL", item("x", "javascript:alert(1)")],
  ["data URL", item("x", "data:text/html,hello")],
  ["invalid URL", item("x", "not-a-url")],
  ["URL credentials", item("x", "https://user:pass@x.com/gecerli")],
  ["non-default port", item("x", "https://x.com:8443/gecerli")],
  ["encoded reserved path", item("x", "https://x.com/%6cogin")],
  ["Facebook duplicate id", item("facebook", "https://facebook.com/profile.php?id=1&id=2")],
  ["Facebook content query", item("facebook", "https://facebook.com/profile.php?id=1&story_fbid=2")],
  ["unsupported platform", item("telegram", "https://t.me/gecerli")],
];

for (const [name, input] of rejectedUrls) {
  test(`rejects ${name}`, () => {
    assert.equal(normalizeLinkVitrineIdentityUrl(input), null);
  });
}

test("rejects inactive links without changing their visible URL data", () => {
  const input = item("x", "https://x.com/gecerli", { isActive: false });

  assert.equal(normalizeLinkVitrineIdentityUrl(input), null);
  assert.equal(input.url, "https://x.com/gecerli");
});

test("deduplicates canonical identity URLs in insertion order", () => {
  const items = [
    item("x", "http://www.x.com/gecerli?utm_source=test#top"),
    item("x", "https://x.com/gecerli"),
    item("youtube", "https://youtube.com/watch?v=abc"),
    item("instagram", "https://www.instagram.com/diger/?utm_medium=social"),
  ];
  const snapshot = structuredClone(items);

  assert.deepEqual(buildLinkVitrineIdentitySameAs(items), [
    "https://x.com/gecerli",
    "https://instagram.com/diger",
  ]);
  assert.deepEqual(items, snapshot);
});
