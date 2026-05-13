import axios from "axios";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RAPIDAPI_HOST = "auto-download-all-in-one.p.rapidapi.com";
const RAPIDAPI_URL = `https://${RAPIDAPI_HOST}/v1/social/autolink`;

function validateUrl(value) {
  if (!value || typeof value !== "string") {
    throw new Error("Please enter a valid media URL.");
  }

  const trimmed = value.trim();

  let parsed;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Invalid URL. Please use an https:// link.");
  }

  return parsed.toString();
}

export async function POST(request) {
  try {
    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json(
        {
          ok: false,
          message: "Server is missing RAPIDAPI_KEY environment variable.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const url = validateUrl(body?.url);

    const { data } = await axios.post(
      RAPIDAPI_URL,
      {
        url,
      },
      {
        timeout: 45000,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36 OPR/78.0.4093.184",
          "x-rapidapi-host": RAPIDAPI_HOST,
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        },
      },
    );

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    const isAxios = axios.isAxiosError(error);

    const status = isAxios
      ? error.response?.status || 502
      : error.message?.includes("Invalid")
        ? 400
        : 500;

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Failed to fetch media.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status },
    );
  }
}
