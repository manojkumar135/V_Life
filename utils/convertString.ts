// utils/stringUtils.ts
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean) // avoid empty words from double spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
