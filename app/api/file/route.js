import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeFileName(name) {
  return String(name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function isPrivateIPv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function validateTargetUrl(value) {
  if (!value) throw new Error("Missing file URL.");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Invalid file URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Unsupported file URL.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || isPrivateIPv4(hostname)) {
    throw new Error("Blocked unsafe file URL.");
  }
  return parsed.toString();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const targetUrl = validateTargetUrl(searchParams.get("url"));
    const fileName = sanitizeFileName(searchParams.get("name") || "media");

    // Menambahkan Header manipulasi agar lebih mirip browser sungguhan
    const upstream = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "video/webm,video/mp4,video/*,audio/*,*/*",
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com"
      },
    });

    // JIKA GAGAL (Contoh: YouTube memblokir IP Server kita dengan 403 Forbidden)
    // Jangan berikan error JSON. Langsung redirect browser ke URL asli videonya.
    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(targetUrl, 302);
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // Jika ada error fatal (seperti URL tidak valid), kembalikan respon error
    return NextResponse.json(
      { ok: false, message: error.message || "Download failed." },
      { status: 400 }
    );
  }
}
