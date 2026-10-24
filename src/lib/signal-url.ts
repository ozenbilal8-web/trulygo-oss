export function getSignalPublicUrl(origin: string, slug: string) {
  return `${origin.replace(/\/$/, "")}/signal/${slug}`;
}
