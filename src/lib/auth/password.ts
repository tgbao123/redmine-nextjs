import crypto from "crypto";

/**
 * Redmine uses SHA1 hashing with salt
 * Format: SHA1(salt + SHA1(password))
 */
export function hashPassword(password: string, salt: string): string {
    const sha1Password = crypto.createHash("sha1").update(password).digest("hex");
    return crypto.createHash("sha1").update(salt + sha1Password).digest("hex");
}

export function verifyPassword(
    password: string,
    hashedPassword: string,
    salt: string
): boolean {
    const computed = hashPassword(password, salt);
    return computed === hashedPassword;
}

export function generateSalt(): string {
    return crypto.randomBytes(16).toString("hex");
}

export function generateSessionToken(): string {
    // Redmine tokens.value is VarChar(40), so 20 bytes = 40 hex chars
    return crypto.randomBytes(20).toString("hex");
}
