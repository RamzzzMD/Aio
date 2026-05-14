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
    a === 10 || a === 127 || a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function validateTargetUrl(value) {
  if (!value) throw new Error("URL file tidak ditemukan.");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("URL file tidak valid.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Protokol tidak didukung.");
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || isPrivateIPv4(hostname)) {
    throw new Error("Akses ke URL lokal dilarang.");
  }
  return parsed.toString();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = validateTargetUrl(searchParams.get("url"));
    const fileName = sanitizeFileName(searchParams.get("name") || "media");

    const upstream = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "*/*",
        "referer": "https://www.google.com/", // Manipulasi referer agar tidak diblokir
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { ok: false, message: "Server media menolak permintaan. File mungkin diproteksi." },
        { status: upstream.status || 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    const responseHeaders = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    };

    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    // Mengalirkan (Stream) body secara langsung untuk efisiensi memori
    return new NextResponse(upstream.body, {
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error.message || "Gagal mengunduh file." },
      { status: 400 }
    );
  }
}
