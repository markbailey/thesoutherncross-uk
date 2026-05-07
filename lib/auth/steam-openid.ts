// Steam OpenID 2.0 helpers using the `openid` npm package (classic OpenID 2.0).
// The `openid` package is CommonJS; esModuleInterop handles the default import.
import openid from 'openid';

type RelyingParty = InstanceType<typeof openid.RelyingParty>;

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';

function getSiteBaseUrl(): string {
  return process.env['SITE_BASE_URL'] ?? 'http://localhost:3000';
}

function getRelyingParty(callbackUrl: string): RelyingParty {
  return new openid.RelyingParty(callbackUrl, getSiteBaseUrl(), true, true, []);
}

// Construct the Steam OpenID auth URL directly rather than relying on the
// openid package's discovery, which resolves the endpoint path against the
// realm (our site) instead of the Steam origin, producing the wrong URL.
export async function buildLoginUrl(callbackUrl: string): Promise<string> {
  const params = new URLSearchParams({
    'openid.mode': 'checkid_setup',
    'openid.ns': OPENID_NS,
    'openid.identity': `${OPENID_NS}/identifier_select`,
    'openid.claimed_id': `${OPENID_NS}/identifier_select`,
    'openid.return_to': callbackUrl,
    'openid.realm': getSiteBaseUrl(),
  });
  return `${STEAM_OPENID_ENDPOINT}?${params.toString()}`;
}

type AssertionResult = { authenticated: boolean; claimedIdentifier?: string };

export async function verifyAssertion(requestUrl: string, callbackUrl: string): Promise<string> {
  const rp = getRelyingParty(callbackUrl);
  return new Promise((resolve, reject) => {
    rp.verifyAssertion(
      requestUrl,
      (err: Error | null, result: AssertionResult | null | undefined) => {
        if (err) return reject(err);
        if (!result?.authenticated || !result.claimedIdentifier) {
          return reject(new Error('Not authenticated'));
        }
        const match = result.claimedIdentifier.match(/\/id\/(\d+)$/);
        if (!match) return reject(new Error('Could not extract SteamID'));
        resolve(match[1] as string);
      },
    );
  });
}
