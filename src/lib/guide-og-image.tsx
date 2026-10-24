import { SITE_HOST } from "@/lib/seo";
import { ImageResponse } from "next/og";

export const GUIDE_OG_SIZE = { width: 1200, height: 630 } as const;

const background = "linear-gradient(135deg, #07111f 0%, #12355a 58%, #1f6b43 100%)";

function BrandHeader({ category }: { category?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "30px", fontWeight: 700 }}>
        <div style={{ width: "16px", height: "44px", borderRadius: "8px", background: "#6ee99a" }} />
        TrulyGo Rehberler
      </div>
      {category ? (
        <div
          style={{
            padding: "10px 18px",
            borderRadius: "999px",
            border: "1px solid rgba(158,230,181,0.45)",
            background: "rgba(110,233,154,0.1)",
            fontSize: "20px",
            color: "#d8ffe3",
          }}
        >
          {category}
        </div>
      ) : null}
    </div>
  );
}

function GuideOgFrame({ children, path }: { children: React.ReactNode; path: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background,
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {children}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "23px", color: "rgba(255,255,255,0.66)" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#6ee99a" }} />
        {path}
      </div>
    </div>
  );
}

export function createGuideIndexOgImage() {
  return new ImageResponse(
    (
      <GuideOgFrame path={`${SITE_HOST}/rehberler`}>
        <BrandHeader />
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1020px" }}>
          <div style={{ fontSize: "74px", lineHeight: 1.05, fontWeight: 750, letterSpacing: "-0.035em" }}>
            Linklerini daha bilinçli kur, ölç ve yönet
          </div>
          <div style={{ fontSize: "29px", lineHeight: 1.4, color: "rgba(231,255,238,0.78)" }}>
            UTM ve link takibi · Link Vitrini · Çevrim içi anket
          </div>
        </div>
      </GuideOgFrame>
    ),
    GUIDE_OG_SIZE,
  );
}

export function createGuideOgImage({
  category,
  slug,
  title,
}: {
  category: string;
  slug: string;
  title: string;
}) {
  return new ImageResponse(
    (
      <GuideOgFrame path={`${SITE_HOST}/rehberler/${slug}`}>
        <BrandHeader category={category} />
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1040px" }}>
          <div
            style={{
              fontSize: title.length > 58 ? "62px" : "72px",
              lineHeight: 1.08,
              fontWeight: 750,
              letterSpacing: "-0.035em",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: "26px", lineHeight: 1.4, color: "rgba(231,255,238,0.75)" }}>
            Açık sınırlar, uygulanabilir örnekler, gereksiz vaat yok.
          </div>
        </div>
      </GuideOgFrame>
    ),
    GUIDE_OG_SIZE,
  );
}
