"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// ─── Config ───
const UPLOAD_DIR = path.join(process.cwd(), "files");

async function ensureUploadDir() {
    try { await fs.access(UPLOAD_DIR); } catch { await fs.mkdir(UPLOAD_DIR, { recursive: true }); }
}

function generateDiskFilename(originalName: string): string {
    const hash = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(originalName);
    return `${hash}${ext}`;
}

function getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
        ".pdf": "application/pdf", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
        ".zip": "application/zip", ".txt": "text/plain", ".csv": "text/csv", ".html": "text/html",
    };
    return types[ext] || "application/octet-stream";
}

// ─── Upload ───

export async function uploadFileAction(formData: FormData): Promise<{ success: boolean; attachmentId?: number; error?: string }> {
    const user = await getSession();
    if (!user) return { success: false, error: "Not authenticated" };

    const file = formData.get("file") as File;
    if (!file || file.size === 0) return { success: false, error: "No file provided" };

    // Check max file size from settings (default 5MB)
    const maxSizeSetting = await prisma.settings.findFirst({ where: { name: "attachment_max_size" } });
    const maxSizeKB = parseInt(maxSizeSetting?.value || "5120");
    if (file.size > maxSizeKB * 1024) return { success: false, error: `File too large (max ${maxSizeKB}KB)` };

    try {
        await ensureUploadDir();

        const diskFilename = generateDiskFilename(file.name);
        const buffer = Buffer.from(await file.arrayBuffer());
        const digest = crypto.createHash("sha256").update(buffer).digest("hex");

        await fs.writeFile(path.join(UPLOAD_DIR, diskFilename), buffer);

        const attachment = await prisma.attachments.create({
            data: {
                container_type: null, container_id: null,
                filename: file.name, disk_filename: diskFilename,
                filesize: file.size, content_type: getContentType(file.name),
                digest, author_id: user.id,
                created_on: new Date(), description: "",
            },
        });

        return { success: true, attachmentId: attachment.id };
    } catch (error) {
        console.error("Upload error:", error);
        return { success: false, error: "Upload failed" };
    }
}

export async function linkAttachmentsAction(containerType: string, containerId: number, attachmentIds: number[]) {
    if (attachmentIds.length === 0) return;

    await prisma.attachments.updateMany({
        where: { id: { in: attachmentIds }, container_id: null },
        data: { container_type: containerType, container_id: containerId },
    });
}

export async function deleteAttachmentAction(attachmentId: number) {
    const user = await getSession();
    if (!user) return { error: "Not authenticated" };

    const attachment = await prisma.attachments.findFirst({ where: { id: attachmentId } });
    if (!attachment) return { error: "Not found" };

    // Only author or admin can delete
    if (!user.admin && attachment.author_id !== user.id) return { error: "Permission denied" };

    try {
        // Delete file from disk
        const filePath = path.join(UPLOAD_DIR, attachment.disk_filename);
        try { await fs.unlink(filePath); } catch { /* file may not exist */ }

        await prisma.attachments.delete({ where: { id: attachmentId } });
        return { success: true };
    } catch (error) {
        console.error("Delete attachment error:", error);
        return { error: "Failed to delete" };
    }
}

export async function getAttachmentPath(attachmentId: number): Promise<{ filePath: string; filename: string; contentType: string } | null> {
    const attachment = await prisma.attachments.findFirst({ where: { id: attachmentId } });
    if (!attachment) return null;

    const diskDir = attachment.disk_directory ? path.join(UPLOAD_DIR, attachment.disk_directory) : UPLOAD_DIR;
    return {
        filePath: path.join(diskDir, attachment.disk_filename),
        filename: attachment.filename,
        contentType: attachment.content_type || getContentType(attachment.filename),
    };
}
