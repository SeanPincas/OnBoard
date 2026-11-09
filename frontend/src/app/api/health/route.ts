/** Process liveness only. Does not assert database or provider readiness. */
export function GET() {
  return Response.json({
    data: { service: "onboard", status: "ok" },
  });
}
