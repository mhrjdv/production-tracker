"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExtensionApiToken, revokeExtensionApiToken } from "@/lib/actions";
import { Check, Copy, Loader2, Shield, Trash2 } from "lucide-react";

interface TokenItem {
    id: string;
    name: string;
    tokenPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    expiresAt: string | null;
    revokedAt: string | null;
}

interface ExtensionPreferenceItem {
    lastProjectId?: string;
    lastSceneId?: string;
    lastPlatform?: string;
    preferredAssetType?: string;
    preferredStatus?: string;
    openAiBaseUrl?: string;
    openAiModel?: string;
}

export function IntegrationsClient({
    tokens,
    extensionPreferences,
}: {
    tokens: TokenItem[];
    extensionPreferences: ExtensionPreferenceItem;
}) {
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState("Chrome Extension");
    const [expiresInDays, setExpiresInDays] = useState("90");
    const [newToken, setNewToken] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const createToken = () => {
        if (!name.trim()) return;

        startTransition(async () => {
            const result = await createExtensionApiToken({
                name: name.trim(),
                expiresInDays: Number(expiresInDays) || undefined,
            });
            setNewToken(result.token);
            setCopied(false);
        });
    };

    const revokeToken = (tokenId: string) => {
        if (!window.confirm("Revoke this token? The extension will stop syncing until you update it.")) {
            return;
        }

        startTransition(async () => {
            await revokeExtensionApiToken(tokenId);
        });
    };

    const copyToken = async () => {
        if (!newToken) return;
        await navigator.clipboard.writeText(newToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Chrome Extension Access Token</CardTitle>
                    <CardDescription>
                        Create a personal token once, paste it in the extension popup, and sync scene versions from any AI platform tab.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Token Name</Label>
                            <Input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Chrome Extension"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Expires In (days)</Label>
                            <Input
                                value={expiresInDays}
                                onChange={(event) => setExpiresInDays(event.target.value)}
                                type="number"
                                min={1}
                                placeholder="90"
                            />
                        </div>
                    </div>
                    <Button onClick={createToken} disabled={isPending || !name.trim()}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                        Create Token
                    </Button>

                    {newToken && (
                        <Card className="border-primary/30">
                            <CardContent className="pt-4 space-y-3">
                                <p className="text-sm font-medium">
                                    Copy this token now. It is shown only once.
                                </p>
                                <div className="rounded-md bg-muted p-3">
                                    <code className="text-xs break-all">{newToken}</code>
                                </div>
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={copyToken}>
                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? "Copied" : "Copy Token"}
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Synced Extension Defaults</CardTitle>
                    <CardDescription>
                        Last synced project/scene/platform and model defaults saved on your profile.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Project ID</p>
                            <p className="font-mono text-xs">{extensionPreferences.lastProjectId || "—"}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Scene ID</p>
                            <p className="font-mono text-xs">{extensionPreferences.lastSceneId || "—"}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Platform</p>
                            <p className="font-mono text-xs">{extensionPreferences.lastPlatform || "—"}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Preferred Type / Status</p>
                            <p className="font-mono text-xs">
                                {(extensionPreferences.preferredAssetType || "—")} / {(extensionPreferences.preferredStatus || "—")}
                            </p>
                        </div>
                        <div className="rounded-lg border p-3 md:col-span-2">
                            <p className="text-xs text-muted-foreground">OpenAI-Compatible Model Route</p>
                            <p className="font-mono text-xs break-all">
                                {extensionPreferences.openAiBaseUrl || "—"} {extensionPreferences.openAiModel ? `· ${extensionPreferences.openAiModel}` : ""}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Issued Tokens</CardTitle>
                    <CardDescription>Revoke old devices and rotate credentials regularly.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {tokens.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tokens issued yet.</p>
                    ) : (
                        tokens.map((token) => (
                            <div
                                key={token.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                            >
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">{token.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Prefix: {token.tokenPrefix}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Created: {new Date(token.createdAt).toLocaleString()}
                                    </p>
                                    {token.lastUsedAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Last used: {new Date(token.lastUsedAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {token.revokedAt ? (
                                        <Badge variant="secondary">Revoked</Badge>
                                    ) : token.expiresAt ? (
                                        <Badge variant="outline">
                                            Expires {new Date(token.expiresAt).toLocaleDateString()}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">No expiry</Badge>
                                    )}
                                    {!token.revokedAt && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => revokeToken(token.id)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
