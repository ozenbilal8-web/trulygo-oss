import "server-only";

import {
  isValidVitrineHandle,
  normalizeVitrineHandle,
} from "@/lib/link-vitrine-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const PROFILE_VIEW_VISITOR_HASH_PATTERN =
  /^pv1:(cookie|fallback):[A-Za-z0-9_-]{43}$/;

export async function recordLinkVitrineProfileView({
  handle,
  visitorHash,
}: {
  handle: string;
  visitorHash: string;
}) {
  const canonicalHandle = handle.trim();

  if (
    !isSupabaseConfigured() ||
    !isValidVitrineHandle(canonicalHandle) ||
    canonicalHandle !== handle ||
    canonicalHandle !== normalizeVitrineHandle(canonicalHandle) ||
    !PROFILE_VIEW_VISITOR_HASH_PATTERN.test(visitorHash)
  ) {
    return;
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc(
      "record_link_vitrine_profile_view",
      {
        p_handle: canonicalHandle,
        p_visitor_hash: visitorHash,
      },
    );

    if (error) {
      console.warn(
        "[link-vitrine-profile-view] record RPC returned an error",
        { code: error.code },
      );
    }
  } catch {
    console.warn("[link-vitrine-profile-view] record RPC threw");
  }
}
