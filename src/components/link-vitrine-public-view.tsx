import Image from "next/image";
import { SITE_URL } from "@/lib/seo";
import { LinkVitrineCollaborationCta } from "@/components/link-vitrine-collaboration-cta";
import type { CSSProperties } from "react";
import type { LinkVitrine, LinkVitrineItem } from "@/lib/link-vitrines";
import {
  LINK_VITRINE_SPONSORED_LABELS,
  buildVitrineInitials,
  getLinkVitrinePlatform,
  resolveVitrineDisplayName,
  type LinkVitrineAnimationType,
  type LinkVitrinePlatform,
  type LinkVitrineSponsoredLabel,
} from "@/lib/link-vitrine-config";

type SignalVitrineSurveyCard = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  totalParticipants: number;
};

const linkAnimationClassNames: Record<LinkVitrineAnimationType, string> = {
  pulse: "link-vitrine-animation--pulse",
  shake: "link-vitrine-animation--shake",
  neon: "link-vitrine-animation--neon",
  shine: "link-vitrine-animation--shine",
  glow: "link-vitrine-animation--glow",
};

const TRULYGO_OWNED_PATHS = new Set([
  "/",
  "/acik-riza-metni",
  "/anket-olusturucu",
  "/bitly-alternatifi",
  "/cerez-politikasi",
  "/forgot-password",
  "/icon.svg",
  "/kampanya-linki-olusturma",
  "/kanal-linki-olusturma",
  "/kvkk-basvurusu",
  "/link-kisaltma",
  "/link-vitrini",
  "/login",
  "/not-approved",
  "/opengraph-image",
  "/privacy",
  "/qr-kod-olusturucu",
  "/register",
  "/reset-password",
  "/robots.txt",
  "/sitemap.xml",
  "/terms",
  "/utm-link-olusturucu",
  "/whatsapp-link-olusturucu",
]);

const TRULYGO_OWNED_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/auth",
  "/dashboard",
  "/rehberler",
  "/signal",
  "/v",
];

function normalizedPathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function isKnownTrulyGoOwnedUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.origin !== SITE_URL
    ) {
      return false;
    }

    const pathname = normalizedPathname(url.pathname);

    return (
      TRULYGO_OWNED_PATHS.has(pathname) ||
      TRULYGO_OWNED_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      )
    );
  } catch {
    return false;
  }
}

function getPublicLinkRel(item: LinkVitrineItem) {
  if (item.isSponsored) {
    return "sponsored ugc noopener noreferrer";
  }

  return isKnownTrulyGoOwnedUrl(item.url)
    ? "noopener noreferrer"
    : "ugc noopener noreferrer";
}

function PlatformIcon({ size = 18 }: { platform: LinkVitrinePlatform; size?: number }) {
  // Original neutral globe geometry; platform names remain text labels.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}

function CheckBadge() {
  return (
    <span className="link-vitrine-verified" title="TrulyGo ile oluşturuldu">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l2.4 1.8 3 .3 1 2.9 2.4 1.8-1 2.9 1 2.9-2.4 1.8-1 2.9-3 .3L12 22l-2.4-1.8-3-.3-1-2.9-2.4-1.8 1-2.9-1-2.9L5.6 7.6l1-2.9 3-.3z" />
        <path d="m8.5 12.2 2.4 2.3 4.6-4.8" />
      </svg>
    </span>
  );
}

function VitrineAvatar({
  vitrine,
  compact,
  displayName,
}: {
  vitrine: LinkVitrine;
  compact: boolean;
  displayName: string;
}) {
  const initials = buildVitrineInitials(displayName);

  return (
    <div className={compact ? "link-vitrine-avatar is-compact" : "link-vitrine-avatar"}>
      {vitrine.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          decoding="async"
          loading="eager"
          src={vitrine.avatarUrl}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function VitrineLink({
  animationIndex,
  item,
  preview,
}: {
  animationIndex: number;
  item: LinkVitrineItem;
  preview: boolean;
}) {
  const platform = getLinkVitrinePlatform(item.platform);
  const iconClassName = [
    "link-vitrine-link-icon",
    platform?.category === "marketplace" ? "is-marketplace-logo" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const linkLabel = item.label?.trim() || platform?.label || item.platform;
  const sponsoredLabel = item.isSponsored
    ? getSponsoredLabelText(item.sponsoredLabel)
    : null;
  const animationType = item.animationEnabled ? item.animationType : null;
  const animationClassName = animationType
    ? linkAnimationClassNames[animationType]
    : "";
  const linkClassName = [
    "link-vitrine-link",
    sponsoredLabel ? "has-sponsored-badge" : "",
    animationType ? "has-link-animation" : "",
    animationClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const linkStyle = animationType
    ? ({
        "--link-animation-delay": `${(animationIndex % 6) * 0.18}s`,
      } as CSSProperties)
    : undefined;
  const children = (
    <>
      {sponsoredLabel ? (
        <span className="link-vitrine-sponsored-badge">{sponsoredLabel}</span>
      ) : null}
      <span
        className={iconClassName}
        style={{ "--platform-accent": platform?.accent ?? "currentColor" } as CSSProperties}
      >
        <PlatformIcon platform={item.platform} />
      </span>
      <span className="link-vitrine-link-label">{linkLabel}</span>
      <svg className="link-vitrine-link-arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </>
  );

  if (preview) {
    return (
      <span
        className={linkClassName}
        data-link-animation={animationType ?? undefined}
        style={linkStyle}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      className={linkClassName}
      data-link-animation={animationType ?? undefined}
      href={item.url ?? "#"}
      rel={getPublicLinkRel(item)}
      style={linkStyle}
      target="_blank"
    >
      {children}
    </a>
  );
}

function getSponsoredLabelText(label: LinkVitrineSponsoredLabel | null) {
  if (!label) {
    return null;
  }

  return LINK_VITRINE_SPONSORED_LABELS.find((option) => option.id === label)?.label ?? null;
}

function hasSafeLinkUrl(value: string | null) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function SignalVitrineCard({
  preview,
  survey,
}: {
  preview: boolean;
  survey: SignalVitrineSurveyCard;
}) {
  const children = (
    <>
      <span className="link-vitrine-signal-kicker">
        <i aria-hidden="true" />
        Aktif Anket
      </span>
      <span className="link-vitrine-signal-copy">
        <strong>{survey.title}</strong>
        {survey.description ? <small>{survey.description}</small> : null}
      </span>
      {survey.totalParticipants > 0 ? (
        <span className="link-vitrine-signal-meta">
          {survey.totalParticipants.toLocaleString("tr-TR")} katılımcı
        </span>
      ) : null}
      <span className="link-vitrine-signal-button">
        Oy ver
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </span>
    </>
  );

  if (preview) {
    return <span className="link-vitrine-signal-card">{children}</span>;
  }

  return (
    <a className="link-vitrine-signal-card" href={`/signal/${survey.slug}`}>
      {children}
    </a>
  );
}

export function LinkVitrinePublicView({
  collaborationAvailable = false,
  compact = false,
  preview = false,
  signalSurveys = [],
  vitrine,
}: {
  collaborationAvailable?: boolean;
  compact?: boolean;
  preview?: boolean;
  signalSurveys?: SignalVitrineSurveyCard[];
  vitrine: LinkVitrine;
}) {
  const activeItems = vitrine.items
    .filter((item) => item.isActive && hasSafeLinkUrl(item.url))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const hasBanner = Boolean(vitrine.bannerUrl);
  const bannerObjectPosition = `${vitrine.bannerPositionX}% ${vitrine.bannerPositionY}%`;
  const displayName = resolveVitrineDisplayName(vitrine);

  return (
    <div
      className={[
        "link-vitrine-public-view",
        `link-vitrine-theme--${vitrine.theme}`,
        hasBanner ? "has-banner" : "",
        compact ? "is-compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {vitrine.bannerUrl ? (
        <div
          aria-hidden="true"
          className="link-vitrine-public-banner-ambient"
          style={{
            backgroundImage: `url("${vitrine.bannerUrl}")`,
            backgroundPosition: bannerObjectPosition,
          }}
        />
      ) : null}
      {vitrine.bannerUrl ? (
        <div className="link-vitrine-public-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            decoding="async"
            loading="eager"
            src={vitrine.bannerUrl}
            style={{ objectPosition: bannerObjectPosition }}
          />
        </div>
      ) : null}
      <VitrineAvatar vitrine={vitrine} compact={compact} displayName={displayName} />
      <div className="link-vitrine-public-identity">
        <h1>
          {displayName}
          <CheckBadge />
        </h1>
      </div>
      {vitrine.bio ? <p className="link-vitrine-public-bio">{vitrine.bio}</p> : null}

      {collaborationAvailable ? (
        <LinkVitrineCollaborationCta
          handle={vitrine.handle}
          preview={preview}
          theme={vitrine.theme}
        />
      ) : null}

      {signalSurveys.length > 0 ? (
        <div className="link-vitrine-signal-list">
          {signalSurveys.map((survey) => (
            <SignalVitrineCard key={survey.id} preview={preview} survey={survey} />
          ))}
        </div>
      ) : null}

      <div className="link-vitrine-public-links">
        {activeItems.length > 0 ? (
          activeItems.map((item, index) => (
            <VitrineLink
              animationIndex={index}
              item={item}
              key={item.id ?? `${item.platform}-${item.sortOrder}-${index}`}
              preview={preview}
            />
          ))
        ) : signalSurveys.length === 0 ? (
          <div className="link-vitrine-empty-state">Henüz aktif link yok.</div>
        ) : null}
      </div>

      <div className="link-vitrine-public-credit">
        <Image
          alt=""
          className="link-vitrine-credit-logo"
          height={16}
          src="/brand/trulygo-mark.svg"
          unoptimized
          width={18}
        />
        TrulyGo ile oluşturuldu
      </div>
    </div>
  );
}

export function LinkVitrinePhonePreview({
  appOrigin,
  collaborationAvailable = false,
  vitrine,
}: {
  appOrigin: string;
  collaborationAvailable?: boolean;
  vitrine: LinkVitrine;
}) {
  const publicUrl = `${appOrigin.replace(/\/$/, "")}/v/${vitrine.handle || "handle"}`;

  return (
    <div className="link-vitrine-phone-preview">
      <div className="link-vitrine-preview-label">
        <span aria-hidden="true" />
        CANLI · ÖNİZLEME
      </div>
      <div className="link-vitrine-phone-frame">
        <div className="link-vitrine-phone-screen">
          <div className="link-vitrine-phone-notch" aria-hidden="true" />
          <div className="link-vitrine-phone-status" aria-hidden="true">
            <span>9:41</span>
            <span>▮▮▮</span>
          </div>
          <div className="link-vitrine-phone-url">{publicUrl.replace(/^https?:\/\//i, "")}</div>
          <div className="link-vitrine-phone-body">
            <LinkVitrinePublicView
              collaborationAvailable={collaborationAvailable}
              compact
              preview
              vitrine={vitrine}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export { PlatformIcon };
