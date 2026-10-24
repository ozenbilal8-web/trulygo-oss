export type UtmParams = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

export type AppendUtmParamsOptions = {
  overwriteExisting?: boolean;
};

type SearchParamValue = string | string[] | undefined;

const utmKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const channelOverwriteKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

const utmKeySet = new Set<string>(utmKeys);

export function normalizeUtmParam(value: string | null) {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return normalized ? normalized.slice(0, 255) : null;
}

function firstSearchParam(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function extractUtmParams(searchParams: Record<string, SearchParamValue>): UtmParams {
  return {
    utm_source: normalizeUtmParam(firstSearchParam(searchParams.utm_source)),
    utm_medium: normalizeUtmParam(firstSearchParam(searchParams.utm_medium)),
    utm_campaign: normalizeUtmParam(firstSearchParam(searchParams.utm_campaign)),
    utm_content: normalizeUtmParam(firstSearchParam(searchParams.utm_content)),
    utm_term: normalizeUtmParam(firstSearchParam(searchParams.utm_term)),
  };
}

export function appendUtmParams(
  targetUrl: string,
  utmParams: UtmParams,
  options: AppendUtmParamsOptions = {},
) {
  try {
    const url = new URL(targetUrl);

    if (!options.overwriteExisting) {
      utmKeys.forEach((key) => {
        const value = normalizeUtmParam(utmParams[key]);

        if (value && !url.searchParams.has(key)) {
          url.searchParams.set(key, value);
        }
      });

      return url.href;
    }

    const existingTermEntry = Array.from(url.searchParams.entries()).find(
      ([key]) => key.toLowerCase() === "utm_term",
    );

    for (const [key] of Array.from(url.searchParams.entries())) {
      if (utmKeySet.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    for (const key of channelOverwriteKeys) {
      const value = normalizeUtmParam(utmParams[key]);

      if (value) {
        url.searchParams.set(key, value);
      }
    }

    if (existingTermEntry) {
      url.searchParams.set("utm_term", existingTermEntry[1]);
    } else {
      const term = normalizeUtmParam(utmParams.utm_term);

      if (term) {
        url.searchParams.set("utm_term", term);
      }
    }

    return url.href;
  } catch {
    return targetUrl;
  }
}
