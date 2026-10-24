export const LINK_VITRINE_COLLABORATION_REQUEST_TYPES = [
  { id: "collaboration", label: "İş birliği" },
  { id: "advertising", label: "Reklam" },
  { id: "sponsorship", label: "Sponsorluk" },
  { id: "product", label: "Ürün gönderimi" },
  { id: "event", label: "Etkinlik" },
  { id: "other", label: "Diğer" },
] as const;

export const LINK_VITRINE_COLLABORATION_BUDGET_CURRENCIES = [
  "TRY",
  "USD",
  "EUR",
] as const;

export const LINK_VITRINE_COLLABORATION_STATUSES = [
  "new",
  "read",
  "replied",
] as const;

export const LINK_VITRINE_COLLABORATION_NOTIFICATION_LIMIT = 20;
export const LINK_VITRINE_COLLABORATION_NOTIFICATION_SUBJECT_FALLBACK =
  "İş birliği talebi";

export type LinkVitrineCollaborationRequestType =
  (typeof LINK_VITRINE_COLLABORATION_REQUEST_TYPES)[number]["id"];
export type LinkVitrineCollaborationBudgetCurrency =
  (typeof LINK_VITRINE_COLLABORATION_BUDGET_CURRENCIES)[number];
export type LinkVitrineCollaborationStatus =
  (typeof LINK_VITRINE_COLLABORATION_STATUSES)[number];
export type LinkVitrineCollaborationNotificationStatus =
  | "pending"
  | "sent"
  | "failed";
export type LinkVitrineCollaborationVerificationStatus =
  | "unverified"
  | "pending"
  | "verified";

export type LinkVitrineCollaborationSettings = {
  vitrineId: string;
  requestsEnabled: boolean;
  notificationEmail: string;
  notificationEmailVerifiedAt: string | null;
  verificationRequestedAt: string | null;
  verificationExpiresAt: string | null;
  verificationStatus: LinkVitrineCollaborationVerificationStatus;
};

export type LinkVitrineCollaborationRequestSummary = {
  id: string;
  senderName: string;
  requestType: LinkVitrineCollaborationRequestType;
  budgetAmount: string | null;
  budgetCurrency: LinkVitrineCollaborationBudgetCurrency | null;
  subject: string;
  messagePreview: string;
  status: LinkVitrineCollaborationStatus;
  createdAt: string;
};

export type LinkVitrineCollaborationRequestDetail =
  LinkVitrineCollaborationRequestSummary & {
    senderEmail: string;
    senderPhone: string | null;
    message: string;
    notificationStatus: LinkVitrineCollaborationNotificationStatus;
    notificationAttemptedAt: string | null;
  };

export type LinkVitrineCollaborationNotificationSummary = {
  id: string;
  subject: string;
  status: LinkVitrineCollaborationStatus;
  createdAt: string;
};

export type LinkVitrineCollaborationNotificationSnapshot = {
  hasVitrine: boolean;
  requests: LinkVitrineCollaborationNotificationSummary[];
  unreadCount: number;
};

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCollaborationEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function parseLinkVitrineCollaborationBoolean(
  value: unknown,
): boolean | undefined {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return undefined;
}

export function isValidCollaborationEmail(value: unknown): value is string {
  const email = normalizeCollaborationEmail(value);
  const separatorIndex = email.lastIndexOf("@");

  return (
    email.length >= 3 &&
    email.length <= 254 &&
    separatorIndex > 0 &&
    separatorIndex <= 64 &&
    !/[\r\n\u0000-\u001f\u007f-\u009f]/u.test(email) &&
    EMAIL_PATTERN.test(email)
  );
}

export function isLinkVitrineCollaborationRequestType(
  value: unknown,
): value is LinkVitrineCollaborationRequestType {
  return LINK_VITRINE_COLLABORATION_REQUEST_TYPES.some(
    (option) => option.id === value,
  );
}

export function isLinkVitrineCollaborationBudgetCurrency(
  value: unknown,
): value is LinkVitrineCollaborationBudgetCurrency {
  return LINK_VITRINE_COLLABORATION_BUDGET_CURRENCIES.some(
    (currency) => currency === value,
  );
}

export function isLinkVitrineCollaborationStatus(
  value: unknown,
): value is LinkVitrineCollaborationStatus {
  return LINK_VITRINE_COLLABORATION_STATUSES.some(
    (status) => status === value,
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function getLinkVitrineCollaborationNotificationSubject(value: unknown) {
  if (typeof value !== "string") {
    return LINK_VITRINE_COLLABORATION_NOTIFICATION_SUBJECT_FALLBACK;
  }

  const subject = value.trim().slice(0, 150);
  return (
    subject || LINK_VITRINE_COLLABORATION_NOTIFICATION_SUBJECT_FALLBACK
  );
}

export function getNewestLinkVitrineCollaborationNotifications(
  requests: readonly LinkVitrineCollaborationNotificationSummary[],
) {
  return [...requests]
    .sort((left, right) => {
      const leftTimestamp = Date.parse(left.createdAt);
      const rightTimestamp = Date.parse(right.createdAt);

      if (
        Number.isFinite(leftTimestamp) &&
        Number.isFinite(rightTimestamp) &&
        leftTimestamp !== rightTimestamp
      ) {
        return rightTimestamp - leftTimestamp;
      }

      if (Number.isFinite(leftTimestamp) !== Number.isFinite(rightTimestamp)) {
        return Number.isFinite(rightTimestamp) ? 1 : -1;
      }

      return right.id.localeCompare(left.id);
    })
    .slice(0, LINK_VITRINE_COLLABORATION_NOTIFICATION_LIMIT);
}

export function getLinkVitrineCollaborationNotificationBadgeLabel(
  unreadCount: unknown,
) {
  if (
    typeof unreadCount !== "number" ||
    !Number.isSafeInteger(unreadCount) ||
    unreadCount <= 0
  ) {
    return null;
  }

  return unreadCount > 9 ? "9+" : String(unreadCount);
}

export function getCollaborationRequestTypeLabel(
  requestType: LinkVitrineCollaborationRequestType,
) {
  return (
    LINK_VITRINE_COLLABORATION_REQUEST_TYPES.find(
      (option) => option.id === requestType,
    )?.label ?? requestType
  );
}

export function getCollaborationStatusLabel(
  status: LinkVitrineCollaborationStatus,
) {
  if (status === "read") {
    return "Okundu";
  }

  if (status === "replied") {
    return "Yanıtlandı";
  }

  return "Yeni";
}

export function buildCollaborationReplyMailto({
  email,
  subject,
}: {
  email: string;
  subject: string;
}) {
  const normalizedEmail = normalizeCollaborationEmail(email);
  const normalizedSubject =
    typeof subject === "string" ? subject.trim() : "";

  if (
    !isValidCollaborationEmail(normalizedEmail) ||
    !normalizedSubject ||
    normalizedSubject.length > 150 ||
    /[\r\n\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(
      normalizedSubject,
    )
  ) {
    return null;
  }

  const encodedAddress = encodeURIComponent(normalizedEmail).replaceAll(
    "%40",
    "@",
  );
  return `mailto:${encodedAddress}?subject=${encodeURIComponent(`Re: ${normalizedSubject}`)}`;
}

export function getCollaborationVerificationStatus({
  notificationEmailVerifiedAt,
  verificationExpiresAt,
}: {
  notificationEmailVerifiedAt: string | null;
  verificationExpiresAt: string | null;
}): LinkVitrineCollaborationVerificationStatus {
  if (notificationEmailVerifiedAt) {
    return "verified";
  }

  if (
    verificationExpiresAt &&
    Number.isFinite(Date.parse(verificationExpiresAt)) &&
    Date.parse(verificationExpiresAt) > Date.now()
  ) {
    return "pending";
  }

  return "unverified";
}

export function formatCollaborationBudget({
  amount,
  currency,
}: {
  amount: string | null;
  currency: LinkVitrineCollaborationBudgetCurrency | null;
}) {
  if (!amount || !currency) {
    return null;
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return null;
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}
