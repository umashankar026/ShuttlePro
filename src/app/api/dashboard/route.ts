import { NextResponse } from "next/server";
import { createCourt, createGroup, createTeam } from "@/lib/dashboardServer";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, payload } = body as { type: string; payload: any };

  try {
    switch (type) {
      case "court":
        return NextResponse.json(await createCourt(payload.name));
      case "group":
        return NextResponse.json(await createGroup(payload.name));
      case "team":
        return NextResponse.json(await createTeam(payload.groupId, payload.name, payload.playerNames));
      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Failed to process request." }, { status: 400 });
  }
}
