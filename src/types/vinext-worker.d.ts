/** El Worker que genera vinext al compilar (ver src/worker.ts). */
declare module "virtual:vinext-worker-entry" {
  const handler: { fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> };
  export default handler;
}
