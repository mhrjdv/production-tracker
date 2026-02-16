// ============================================================
// POST /api/upload — File Upload Endpoint (Cloudflare R2)
// Handles image uploads for project assets (portraits, keyframes)
// Returns the public R2 URL
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { randomUUID } from "crypto";
import { uploadToR2 } from "@/lib/r2";
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const folder = (formData.get("folder") as string) || "uploads";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: png, jpg, webp" },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Max 5MB" },
      { status: 400 },
    );
  }

  try {
    const ext =
      file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const filename = `${randomUUID()}.${ext}`;
    const key = projectId
      ? `projects/${projectId}/${folder}/${filename}`
      : `uploads/${session.user.id}/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadToR2({
      buffer,
      key,
      contentType: file.type,
    });

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("R2 upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}
