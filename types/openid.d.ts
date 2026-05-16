declare module 'openid' {
  class RelyingParty {
    constructor(
      returnUrl: string,
      realm: string | null,
      stateless: boolean,
      strict: boolean,
      extensions: unknown[],
    );
    authenticate(
      identifier: string,
      immediate: boolean,
      callback: (err: Error | null, url: string | null | undefined) => void,
    ): void;
    verifyAssertion(
      request: string | { url: string },
      callback: (
        err: Error | null,
        result: { authenticated: boolean; claimedIdentifier?: string } | null | undefined,
      ) => void,
    ): void;
  }

  const openid: { RelyingParty: typeof RelyingParty };
  export default openid;
}
