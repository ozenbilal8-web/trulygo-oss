export type LinkVitrineProfileViewTransport = {
  fetchRequest: (url: string, init: RequestInit) => Promise<unknown>;
};

export function recordLinkVitrineProfileViewBestEffort(
  viewPath: string | null,
  transport: LinkVitrineProfileViewTransport,
) {
  if (!viewPath) {
    return;
  }

  try {
    void transport
      .fetchRequest(viewPath, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        keepalive: true,
      })
      .catch(() => undefined);
  } catch {
    // View analytics must never interrupt or replace the public profile.
  }
}
