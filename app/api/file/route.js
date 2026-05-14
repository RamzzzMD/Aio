import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeFileName(name) {
  return String(name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    const fileName = sanitizeFileName(searchParams.get("name") || "media");

    if (!targetUrl) throw new Error("URL file tidak ditemukan.");

    const headers = {
      "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
      "accept": "*/*"
    };

    if (!targetUrl.includes("googlevideo.com")) {
      headers["referer"] = "https://www.google.com/";
    }

    const upstream = await fetch(targetUrl, {
      redirect: "follow",
      headers: headers,
    });

    if (!upstream.ok || !upstream.body) {
      if (targetUrl.includes("googlevideo.com")) {
         return NextResponse.redirect(targetUrl);
      }

      return NextResponse.json(
        { ok: false, message: `Server media menolak permintaan (Status: ${upstream.status}). File diproteksi.` },
        { status: upstream.status || 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    // PERBAIKAN EMOJI: 
    // 1. Buat nama fallback yang hanya berisi huruf/angka (tanpa emoji) untuk browser lama
    const safeFallbackName = fileName.replace(/[^\x20-\x7E]/g, "") || "media.mp4";
    // 2. Encode nama file yang asli (berisi emoji) menggunakan UTF-8
    const encodedFileName = encodeURIComponent(fileName);

    const responseHeaders = {
      "Content-Type": contentType,
      // Gunakan filename*=UTF-8'' agar emoji didukung saat didownload
      "Content-Disposition": `attachment; filename="${safeFallbackName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "no-store",
    };

    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

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
