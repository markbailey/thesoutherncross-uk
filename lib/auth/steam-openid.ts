// Steam OpenID 2.0 helpers using the `openid` npm package (classic OpenID 2.0).
// The `openid` package is CommonJS; esModuleInterop handles the default import.
import openid from 'openid';

type RelyingParty = InstanceType<typeof openid.RelyingParty>;

function getRelyingParty(returnTo: string): RelyingParty {
  const siteBaseUrl = process.env['SITE_BASE_URL'] ?? 'http://localhost:3000';
  return new openid.RelyingParty(returnTo, siteBaseUrl, true, true, []);
}

export async function buildLoginUrl(returnTo: string): Promise<string> {
  const rp = getRelyingParty(returnTo);
  return new Promise((resolve, reject) => {
    rp.authenticate(
      'https://steamcommunity.com/openid',
      false,
      (err: Error | null, url: string | null | undefined) => {
        if (err || !url) return reject(err ?? new Error('No URL returned'));
        resolve(url);
      },
    );
  });
}

type AssertionResult = { authenticated: boolean; claimedIdentifier?: string };

export async function verifyAssertion(callbackUrl: string, returnTo: string): Promise<string> {
  const rp = getRelyingParty(returnTo);
  return new Promise((resolve, reject) => {
    rp.verifyAssertion(
      callbackUrl,
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
