import { createHash, randomBytes } from "crypto";

export interface GeneratedExtensionToken {
    token: string;
    tokenPrefix: string;
    tokenHash: string;
}

export function hashExtensionToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function generateExtensionToken(): GeneratedExtensionToken {
    const raw = randomBytes(24).toString("hex");
    const token = `lmt_${raw}`;
    const tokenPrefix = token.slice(0, 12);
    const tokenHash = hashExtensionToken(token);

    return {
        token,
        tokenPrefix,
        tokenHash,
    };
}
