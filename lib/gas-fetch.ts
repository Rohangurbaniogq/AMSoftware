/**
 * Send write operations to Google Apps Script via GET requests.
 *
 * Google Workspace orgs block POST to Apps Script redirect URLs.
 * Workaround: pass data as a URL parameter in a GET request.
 *
 * For large payloads (like uploading 88+ athletes), the data is
 * sent in chunks if it exceeds URL length limits (~8KB safe limit).
 */

const MAX_URL_LENGTH = 7000; // Safe limit for URL params

export async function gasWrite(
  scriptUrl: string,
  action: string,
  data: unknown
): Promise<unknown> {
  const encoded = encodeURIComponent(JSON.stringify(data));
  const url = `${scriptUrl}?action=${action}&data=${encoded}`;

  // If within URL limits, send as single request
  if (url.length <= MAX_URL_LENGTH) {
    return gasGet(url);
  }

  // For large payloads (uploadAthletes), chunk the data
  if (action === "uploadAthletes" && Array.isArray(data)) {
    // First chunk clears existing data, subsequent chunks append
    const chunkSize = 10;
    let firstChunk = true;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      if (firstChunk) {
        // First chunk: use uploadAthletes which replaces all data
        const chunkUrl = `${scriptUrl}?action=uploadAthletes&data=${encodeURIComponent(JSON.stringify(chunk))}`;
        await gasGet(chunkUrl);
        firstChunk = false;
      } else {
        // Subsequent chunks: use appendAthletes to add to existing
        const chunkUrl = `${scriptUrl}?action=appendAthletes&data=${encodeURIComponent(JSON.stringify(chunk))}`;
        await gasGet(chunkUrl);
      }
    }

    return { success: true, message: `${data.length} athletes uploaded.`, count: data.length };
  }

  throw new Error("Payload too large for URL parameter");
}

async function gasGet(url: string): Promise<unknown> {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();

  if (text.includes("<!DOCTYPE") || text.includes("<html")) {
    throw new Error("Received HTML instead of JSON. Check Apps Script deployment.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON response: " + text.slice(0, 200));
  }
}
