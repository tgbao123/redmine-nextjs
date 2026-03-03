import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadFileAction } from "@/lib/attachments/storage";

export async function POST(request: NextRequest) {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await request.formData();
        const result = await uploadFileAction(formData);

        if (result.success) {
            return NextResponse.json({ upload: { id: result.attachmentId } }, { status: 201 });
        }
        return NextResponse.json({ error: result.error }, { status: 422 });
    } catch (error) {
        console.error("Upload route error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
