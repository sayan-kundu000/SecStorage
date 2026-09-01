import { useState, useEffect } from "react";
import { UserPlus, Shield, Eye, Edit3, Send, Link2, Users, Trash2 } from "lucide-react";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PublicLinkManager } from "../../features/shared/components/PublicLinkManager";
import { sharesService } from "../../services/api/shares.service";
import { ShareResponse } from "../../types";
import { notify } from "../../components/ui/toast";
import { normalizeFileError } from "../../features/files/utils/errorNormalization";

export interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetId: string;
  isFolder: boolean;
  onShare: (granteeEmail: string, permission: "VIEWER" | "EDITOR") => Promise<void>;
  isLoading?: boolean;
}

export function ShareDialog({
  isOpen,
  onClose,
  targetName,
  targetId,
  isFolder,
  onShare,
  isLoading = false,
}: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<"collaborators" | "public">("collaborators");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Shares list for this target resource
  const [activeShares, setActiveShares] = useState<ShareResponse[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  const fetchActiveShares = async () => {
    if (!targetId) return;
    setIsLoadingShares(true);
    try {
      const res = isFolder
        ? await sharesService.listFolderShares(targetId)
        : await sharesService.listFileShares(targetId);
      setActiveShares(res.shares || []);
    } catch {
      setActiveShares([]);
    } finally {
      setIsLoadingShares(false);
    }
  };

  useEffect(() => {
    if (isOpen && targetId) {
      fetchActiveShares();
    }
  }, [isOpen, targetId, isFolder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!email.trim() || !email.includes("@")) {
      setEmailError("Please enter a valid user email address.");
      return;
    }

    try {
      await onShare(email.trim(), permission);
      setEmail("");
      fetchActiveShares();
    } catch (err) {
      const normalized = normalizeFileError(err);
      setEmailError(normalized.message);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await sharesService.deleteShare(shareId);
      notify.success("Access Revoked");
      setActiveShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (err) {
      const normalized = normalizeFileError(err);
      notify.error("Failed to revoke share", normalized.message);
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: "VIEWER" | "EDITOR") => {
    try {
      const updated = await sharesService.updateShare(shareId, { permission: newPermission });
      notify.success("Permission Updated", `Permission set to ${newPermission}.`);
      setActiveShares((prev) => prev.map((s) => (s.id === shareId ? updated : s)));
    } catch (err) {
      const normalized = normalizeFileError(err);
      notify.error("Failed to update permission", normalized.message);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-foreground">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <span>Share {isFolder ? "Folder" : "File"}</span>
        </div>
      }
      description={`Manage collaboration & public sharing settings for "${targetName}"`}
      maxWidth="md"
    >
      <div className="space-y-4 py-1 text-left">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("collaborators")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "collaborators"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People Access</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("public")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === "public"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Public Links</span>
          </button>
        </div>

        {activeTab === "collaborators" ? (
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                label="Grantee Email Address"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                error={emailError || undefined}
                autoFocus
              />

              <div className="space-y-1.5">
                <label className="text-xs font-medium leading-none text-foreground">
                  Permission Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPermission("VIEWER")}
                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                      permission === "VIEWER"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/80 bg-background/50 hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    <Eye className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Viewer</div>
                      <div className="text-[10px] text-muted-foreground">Can view & download</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermission("EDITOR")}
                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-colors ${
                      permission === "EDITOR"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/80 bg-background/50 hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    <Edit3 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Editor</div>
                      <div className="text-[10px] text-muted-foreground">Can edit & rename</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="default"
                  size="sm"
                  type="submit"
                  isLoading={isLoading}
                  className="gap-1.5 shadow-sm"
                >
                  <span>Grant Access</span>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>

            {/* Active Collaborators List */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h5 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                People with Access ({activeShares.length})
              </h5>

              {isLoadingShares ? (
                <div className="p-3 text-center text-muted-foreground text-xs">Loading collaborators...</div>
              ) : activeShares.length === 0 ? (
                <div className="p-3 text-center border border-dashed border-border/60 rounded-xl bg-card/20 text-muted-foreground text-xs">
                  No individual collaborators granted access yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {activeShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-background/60 gap-2 text-xs"
                    >
                      <div className="truncate min-w-0">
                        <p className="font-medium text-foreground truncate">{share.grantee_email || "User"}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {share.permission}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={share.permission}
                          onChange={(e) =>
                            handleUpdatePermission(share.id, e.target.value as "VIEWER" | "EDITOR")
                          }
                          className="bg-card border border-border text-foreground text-[11px] rounded-md px-2 py-1 focus:outline-none cursor-pointer"
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeShare(share.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Revoke Access"
                          aria-label="Revoke collaborator access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>RBAC permissions are verified on every API request</span>
            </div>
          </div>
        ) : (
          <PublicLinkManager targetId={targetId} targetName={targetName} isFolder={isFolder} />
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
