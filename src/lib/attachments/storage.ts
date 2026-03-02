"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "files");

export async function saveAttachment(
    file: File,
    containerId: number,
    containerType: string,
    description?: string
): Promise<{ success: boolean; attachmentId?: number; error?: string }> {
    try {
        const user = await getSession();
        if (!user) return { success: false, error: "Not authenticated" };

        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Generate disk filename (timestamp + random hex)
        const ext = path.extname(file.name);
        const diskFilename = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;

        // Calculate digest
        const digest = crypto.createHash("sha256").update(buffer).digest("hex");

        // Determine disk directory (YYYY/MM format like Redmine)
        const now = new Date();
        const diskDirectory = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

        // Ensure directory exists
        const fullDir = path.join(UPLOAD_DIR, diskDirectory);
        await fs.mkdir(fullDir, { recursive: true });

        // Write file
        await fs.writeFile(path.join(fullDir, diskFilename), buffer);

        // Create DB record
        const attachment = await prisma.attachments.create({
            data: {
                container_id: containerId,
                container_type: containerType,
                filename: file.name,
                disk_filename: diskFilename,
                filesize: BigInt(buffer.length),
                content_type: file.type || "application/octet-stream",
                digest,
                downloads: 0,
                author_id: user.id,
                created_on: now,
                description: description || null,
                disk_directory: diskDirectory,
            },
        });

        return { success: true, attachmentId: attachment.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getAttachments(containerId: number, containerType: string) {
    return prisma.attachments.findMany({
        where: { container_id: containerId, container_type: containerType },
        orderBy: { created_on: "asc" },
    });
}

export async function deleteAttachment(attachmentId: number): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await getSession();
        if (!user) return { success: false, error: "Not authenticated" };

        const attachment = await prisma.attachments.findFirst({ where: { id: attachmentId } });
        if (!attachment) return { success: false, error: "Not found" };

        // Only author or admin can delete
        if (attachment.author_id !== user.id && !user.admin) {
            return { success: false, error: "Permission denied" };
        }

        // Delete file from disk
        try {
            const filePath = path.join(UPLOAD_DIR, attachment.disk_directory || "", attachment.disk_filename);
            await fs.unlink(filePath);
        } catch { /* file may not exist */ }

        await prisma.attachments.delete({ where: { id: attachmentId } });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
