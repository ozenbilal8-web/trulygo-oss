export async function appendOptionalSitemapEntries<T>(
  staticEntries: readonly T[],
  loadOptionalEntries: () => Promise<readonly T[]>,
): Promise<T[]> {
  try {
    return [...staticEntries, ...(await loadOptionalEntries())];
  } catch {
    return [...staticEntries];
  }
}
