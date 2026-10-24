import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL } from "@/lib/seo";

export const runtime = "edge";

export const alt = DEFAULT_TITLE;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Original neutral OSS mark, also used by public/brand/trulygo-mark.svg.
const TRULYGO_MARK_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" role=\"img\" aria-label=\"TrulyGo OSS link mark\"><title>Original neutral link mark</title><g fill=\"none\" stroke=\"#56c591\" stroke-width=\"6\" stroke-linecap=\"round\"><path d=\"M27 40l-5 5a10 10 0 01-14-14l11-11a10 10 0 0114 0\"/><path d=\"M37 24l5-5a10 10 0 0114 14L45 44a10 10 0 01-14 0\"/><path d=\"M24 40l16-16\"/></g></svg>";

const TRULYGO_MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  TRULYGO_MARK_SVG,
)}`;

export default async function OpengraphImage() {
  const displayUrl = SITE_URL.replace(/^https?:\/\//i, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0a1020 0%, #12355a 55%, #1f6b43 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
          <div
            style={{
              width: "112px",
              height: "112px",
              borderRadius: "26px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={TRULYGO_MARK_DATA_URI}
              width={80}
              height={80}
              alt=""
              style={{ display: "block" }}
            />
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: "56px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "26px",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: "78px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: "960px",
            }}
          >
            Güvenli UTM’li Link Oluşturma ve Link Yönetim Platformu
          </div>
          <div
            style={{
              color: "rgba(221, 248, 232, 0.78)",
              fontSize: "30px",
              fontWeight: 500,
              lineHeight: 1.35,
              maxWidth: "920px",
            }}
          >
            {DEFAULT_DESCRIPTION}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "26px",
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#6ee99a",
              boxShadow: "0 0 14px rgba(110,233,154,0.85)",
            }}
          />
          {displayUrl}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
