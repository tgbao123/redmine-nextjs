import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "files");

// GET /api/attachments/[id] — serve file with auth check
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const attachmentId = parseInt(id);
    if (isNaN(attachmentId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const attachment = await prisma.attachments.findFirst({ where: { id: attachmentId } });
    if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const filePath = path.join(UPLOAD_DIR, attachment.disk_directory || "", attachment.disk_filename);

    try {
        const buffer = await fs.readFile(filePath);

        // Increment download count
        await prisma.attachments.update({ where: { id: attachmentId }, data: { downloads: attachment.downloads + 1 } });

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": attachment.content_type || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
                "Content-Length": String(buffer.length),
            },
        });
    } catch {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }
}
