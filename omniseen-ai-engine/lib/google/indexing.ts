// ============================================================
// OmniSeen — Google Indexing API + Search Console Wrapper
// ============================================================

// ---- Indexing API ----

export type IndexingType = "URL_UPDATED" | "URL_DELETED";

export async function submitUrl(url: string, type: IndexingType = "URL_UPDATED"): Promise<boolean> {
  const saKeyRaw = Deno.env.get("GOOGLE_INDEXING_SA_KEY");
  if (!saKeyRaw) throw new Error("GOOGLE_INDEXING_SA_KEY not set");

  const saKey = JSON.parse(saKeyRaw);
  const jwt   = await buildServiceAccountJWT(saKey);

  const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ url, type }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Indexing API error ${res.status}: ${err}`);
    return false;
  }
  return true;
}

// ---- IndexNow (Bing + Yandex) ----

export async function submitIndexNow(url: string, host: string): Promise<boolean> {
  const key = Deno.env.get("INDEXNOW_KEY");
  if (!key) return false;

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `https://${host}/${key}.txt`,
      urlList: [url],
    }),
  });

  return res.ok;
}

// ---- Search Console API ----

export interface GSCPerformanceRow {
  query:       string;
  page:        string;
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
}

export async function getSearchPerformance(
  siteUrl: string,
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = ["query", "page"]
): Promise<GSCPerformanceRow[]> {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions,
        rowLimit: 1000,
      }),
    }
  );

  if (!res.ok) throw new Error(`Search Console API error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return (data.rows ?? []).map((row: Record<string, unknown>) => ({
    query:       row.keys?.[0] as string ?? "",
    page:        row.keys?.[1] as string ?? "",
    clicks:      row.clicks      as number ?? 0,
    impressions: row.impressions as number ?? 0,
    ctr:         row.ctr         as number ?? 0,
    position:    row.position    as number ?? 0,
  }));
}

// ---- JWT builder for Service Account ----

async function buildServiceAccountJWT(sa: Record<string, string>): Promise<string> {
  const now     = Math.floor(Date.now() / 1000);
  const header  = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss:   sa.client_email,
    sub:   sa.client_email,
    aud:   "https://indexing.googleapis.com/",
    iat:   now,
    exp:   now + 3600,
    scope: "https://www.googleapis.com/auth/indexing",
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import RSA private key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${signingInput}.${sigBase64}`;
}
