import { useState, useEffect } from "react";
import { Link2, Copy, Check, Trash2, Key, Calendar } from "lucide-react";
import { publicLinksService } from "../../../services/api/publicLinks.service";
import { PublicLinkResponse } from "../../../types";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { notify } from "../../../components/ui/toast";
import { normalizeFileError } from "../../files/utils/errorNormalization";

export interface PublicLinkManagerProps {
  targetId: string;
  targetName: string;
  isFolder: boolean;
}

export function PublicLinkManager({ targetId, targetName, isFolder }: PublicLinkManagerProps) {
  const [links, setLinks] = useState<PublicLinkResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form fields for new public link creation
  const [password, setPassword] = useState("");
  const [allowDownload, setAllowDownload] = useState(true);

  const fetchPublicLinks = async () => {
    setIsLoading(true);
    try {
      const res = isFolder
        ? await publicLinksService.listFolderPublicLinks(targetId)
        : await publicLinksService.listFilePublicLinks(targetId);
      setLinks(res.links || []);
    } catch {
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (targetId) {
      fetchPublicLinks();
    }
  }, [targetId, isFolder]);

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      let created: PublicLinkResponse;
      if (isFolder) {
        created = await publicLinksService.createFolderPublicLink(targetId, {
          folder_id: targetId,
          permission: "VIEWER",
          password: password.trim() || undefined,
          allow_download: allowDownload,
        });
      } else {
        created = await publicLinksService.createFilePublicLink(targetId, {
          file_id: targetId,
          permission: "VIEWER",
          password: password.trim() || undefined,
          allow_download: allowDownload,
        });
      }

      notify.success("Public Link Generated", `Share link created for "${targetName}".`);
      setPassword("");
      setLinks((prev) => [created, ...prev]);
    } catch (err) {
      const normalized = normalizeFileError(err);
      notify.error("Failed to create public link", normalized.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    try {
      await publicLinksService.revokePublicLink(linkId);
      notify.success("Public Link Disabled");
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      const normalized = normalizeFileError(err);
      notify.error("Failed to revoke link", normalized.message);
    }
  };

  const handleCopyLink = (token?: string | null) => {
    if (!token) return;
    const publicUrl = `${window.location.origin}/public/${token}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedToken(token);
    notify.success("Link Copied to Clipboard", publicUrl);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Create New Link Section */}
      <div className="p-3.5 rounded-xl border border-border/80 bg-card/40 space-y-3">
        <h5 className="font-semibold text-foreground flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-primary" />
          <span>Create Public Share Link</span>
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Optional Password Protection"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            startIcon={<Key className="w-3.5 h-3.5" />}
          />

          <div className="flex items-center gap-2 px-3 border border-border/80 rounded-lg bg-background/50">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-foreground">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(e) => setAllowDownload(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Allow Direct Download</span>
            </label>
          </div>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleCreateLink}
          isLoading={isCreating}
          className="w-full h-8 text-xs gap-1.5 shadow-sm"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Generate Public Link</span>
        </Button>
      </div>

      {/* Active Public Links List */}
      <div className="space-y-2">
        <h5 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
          Active Public Links ({links.length})
        </h5>

        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-xs">Loading public links...</div>
        ) : links.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-border/60 rounded-xl bg-card/20 text-muted-foreground">
            No public share links created for this item yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/60 gap-2"
              >
                <div className="truncate min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-foreground truncate font-medium">
                    {window.location.origin}/public/{link.token || link.id}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    {link.has_password && (
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        <Key className="w-3 h-3" /> Password Protected
                      </span>
                    )}
                    {link.expires_at && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" /> Expires {new Date(link.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(link.token || link.id)}
                    className="h-7 px-2 text-[11px] gap-1"
                    title="Copy Link"
                  >
                    {copiedToken === (link.token || link.id) ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedToken === (link.token || link.id) ? "Copied" : "Copy"}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokeLink(link.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Disable Link"
                    aria-label="Revoke public link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
