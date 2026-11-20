import { NextResponse } from "next/server";
import { seedDemoData } from "@/lib/demo-data";
import { serverError } from "@/lib/http";

export async function POST() {
  try {
    if (process.env.ENABLE_DEMO_RESET === "false") {
      return NextResponse.json({ error: "Demo reset is disabled" }, { status: 403 });
    }
    await seedDemoData(true);
    return NextResponse.json({ success: true, message: "Synthetic demo data restored" });
  } catch (error) {
    return serverError(error);
  }
}
