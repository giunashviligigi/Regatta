import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings, updateSiteSettings } from "@/lib/db";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const imagesLink =
    typeof body.images_link === "string" ? body.images_link : "";

  if (imagesLink && !/^https?:\/\//i.test(imagesLink)) {
    return NextResponse.json(
      { error: "Link must start with http:// or https://" },
      { status: 400 }
    );
  }

  const settings = await updateSiteSettings(imagesLink);
  return NextResponse.json(settings);
}
