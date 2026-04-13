const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface TokenDebugInfo {
  is_valid: boolean;
  app_id: string;
  expires_at: number;
  scopes: string[];
  error?: { code: number; subcode: number; message: string };
}

export async function debugToken(
  token: string,
  appId: string,
  appSecret: string
): Promise<TokenDebugInfo & { raw?: unknown }> {
  const appToken = `${appId}|${appSecret}`;
  const res = await fetch(
    `${GRAPH_BASE}/debug_token?input_token=${token}&access_token=${appToken}`
  );
  const data = await res.json();

  // If there's a top-level error (e.g. invalid app credentials), surface it
  if (data.error) {
    return {
      is_valid: false,
      app_id: appId,
      expires_at: 0,
      scopes: [],
      error: data.error,
      raw: data,
    };
  }

  // The debug info lives under data.data
  const info = data.data || {};
  return {
    is_valid: info.is_valid ?? false,
    app_id: info.app_id ?? "",
    expires_at: info.expires_at ?? 0,
    scopes: info.scopes ?? [],
    error: info.error,
    raw: data,
  };
}

export async function exchangeForLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const res = await fetch(
    `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || "Token exchange failed");
  }
  return data;
}

export async function getPageToken(
  userToken: string,
  pageId: string
): Promise<{ pageToken: string; pageName: string } | null> {
  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?access_token=${userToken}`
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "Failed to fetch pages");
  }

  const page = data.data?.find((p: { id: string }) => p.id === pageId);
  if (!page) return null;

  return { pageToken: page.access_token, pageName: page.name };
}

export function isTokenExpiredError(error: { code?: number; error_subcode?: number }): boolean {
  return error.code === 190;
}
