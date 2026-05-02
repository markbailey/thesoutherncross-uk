// Minimal type stub for `gamedig` (v5 ships without published d.ts).
// We only use GameDig.query({ type, host, port }) and treat its result as unknown.

declare module 'gamedig' {
  export interface QueryArgs {
    type: string;
    host: string;
    port: number;
    [key: string]: unknown;
  }
  export const GameDig: {
    query: (args: QueryArgs) => Promise<unknown>;
  };
  export default GameDig;
}
