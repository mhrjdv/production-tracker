import { NextRequest, NextResponse } from "next/server";
import { isAllowedImageHost } from "@/lib/image-utils";

/**
 * Proxies an image fetch to bypass CORS restrictions.
 * Only allows hosts from the image-utils allowlist.
 *
 * Usage: GET /api/image-proxy?url=https://...
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  if (!isAllowedImageHost(url)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(120_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png";
    const body = upstream.body;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
