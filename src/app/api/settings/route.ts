import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings, updateSiteSettings } from "@/lib/db";
import type { SiteSettings } from "@/lib/types";

function validateLink(value: string, label: string): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) {
    return `${label} must start with http:// or https://`;
  }
  return null;
}

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const payload: Partial<SiteSettings> = {};

  if (typeof body.images_link === "string") {
    payload.images_link = body.images_link;
  }
  if (typeof body.facebook_link === "string") {
    payload.facebook_link = body.facebook_link;
  }
  if (typeof body.instagram_link === "string") {
    payload.instagram_link = body.instagram_link;
  }

  for (const [key, label] of [
    ["images_link", "Images link"],
    ["facebook_link", "Facebook link"],
    ["instagram_link", "Instagram link"],
  ] as const) {
    const err = validateLink(payload[key] ?? "", label);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  const settings = await updateSiteSettings(payload);
  return NextResponse.json(settings);
}
