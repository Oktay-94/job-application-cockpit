// navigator.clipboard only exists in secure contexts (HTTPS/localhost).
// Until Etappe 8 the app runs over plain HTTP in the home network, so a
// visible manual-copy fallback is required, not just an error message.
export async function inZwischenablage(text: string): Promise<boolean> {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
