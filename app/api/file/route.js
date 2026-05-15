import { NextResponse } from "next/server";

export const runtime = "nodejs";

function sanitizeFileName(name) {
  return String(name || "media.mp4")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    // Memperbesar batas limit ke 200 agar ekstensi (.mp4/.jpg) di akhir tidak ikut terpotong
    .slice(0, 200); 
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    const fileName = sanitizeFileName(searchParams.get("name"));

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

    // Pastikan nama fallback aman dari karakter aneh, namun tetap menyisakan format
    const safeFallbackName = fileName.replace(/[^\x20-\x7E]/g, ""); 
    const encodedFileName = encodeURIComponent(fileName);

    const responseHeaders = {
      "Content-Type": contentType,
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
