import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) {
    return new NextResponse(JSON.stringify({ publicKey: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return NextResponse.json({ publicKey: key });
}
