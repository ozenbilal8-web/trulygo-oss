"use client";

import { useEffect } from "react";
import { recordLinkVitrineProfileViewBestEffort } from "@/lib/link-vitrine-profile-view-transport";
import { buildLinkVitrineProfileViewPath } from "@/lib/link-vitrine-profile-views";

export function LinkVitrineProfileViewTracker({ handle }: { handle: string }) {
  const viewPath = buildLinkVitrineProfileViewPath(handle);

  useEffect(() => {
    recordLinkVitrineProfileViewBestEffort(viewPath, {
      fetchRequest: (url, init) => fetch(url, init),
    });
  }, [viewPath]);

  return null;
}
