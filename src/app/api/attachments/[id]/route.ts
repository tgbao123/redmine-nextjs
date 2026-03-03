import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAttachmentPath } from "@/lib/attachments/storage";
import fs from "fs/promises";

interface Props {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const attachmentId = parseInt(id);
    if (isNaN(attachmentId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const info = await getAttachmentPath(attachmentId);
    if (!info) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
        const buffer = await fs.readFile(info.filePath);
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": info.contentType,
                "Content-Disposition": `inline; filename="${encodeURIComponent(info.filename)}"`,
                "Content-Length": buffer.length.toString(),
            },
        });
    } catch {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }
}
