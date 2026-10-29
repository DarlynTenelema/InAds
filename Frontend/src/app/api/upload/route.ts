import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eevqfesqttqzrcldnydz.supabase.co"
).replace(/\/$/, "");

// Llave service_role para almacenar imágenes en el bucket público app-icons
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldnFmZXNxdHRxenJjbGRueWR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzIxMTAxMiwiZXhwIjoyMTA4Nzg3MDEyfQ.bkwwJxDygJDBl4EjJRBTE6OSJcIbQKK2WpKmm8XRUC8";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("icon") as File | null;

    if (!file) {
      return NextResponse.json(
        { status: "error", message: "No se proporcionó ningún archivo de imagen" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { status: "error", message: "La imagen excede el límite máximo de 5 MB" },
        { status: 400 }
      );
    }

    const mime = file.type || "image/png";
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowed.includes(mime.toLowerCase())) {
      return NextResponse.json(
        { status: "error", message: "Formato no permitido. Usa PNG, JPG, WEBP o GIF." },
        { status: 400 }
      );
    }

    const ext = mime.includes("jpeg") || mime.includes("jpg")
      ? "jpg"
      : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
      ? "gif"
      : "png";

    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const fileName = `icon_${Date.now()}_${randomSuffix}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/app-icons/${fileName}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": mime,
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { status: "error", message: `Error subiendo a almacenamiento: ${errText}` },
        { status: 500 }
      );
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/app-icons/${fileName}`;

    return NextResponse.json({
      status: "success",
      icon_url: publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || "Error procesando archivo" },
      { status: 500 }
    );
  }
}

