import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Activity, ShieldAlert, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/common/PageHeader";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { EmptyState } from "../../components/common/EmptyState";
import { ErrorState } from "../../components/common/ErrorState";
import { FileListSkeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { activityService } from "../../services";
import { QUERY_KEYS } from "../../app/config/constants";
import { formatDate, formatRelativeTime } from "../../utils/formatters";
import { useAuth } from "../../hooks/useAuth";

export function ActivityPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "audit" && user?.is_admin ? "audit" : "feed";
  const [activeTab, setActiveTab] = useState<"feed" | "audit">(initialTab);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const handleTabChange = (tab: "feed" | "audit") => {
    setActiveTab(tab);
    setPage(1);
    setSearchParams(tab === "audit" ? { tab: "audit" } : {});
  };

  const { data: feedData, isLoading: isLoadingFeed, isError: isErrorFeed, error: errorFeed, refetch: refetchFeed } = useQuery({
    queryKey: QUERY_KEYS.ACTIVITY.FEED(page, pageSize),
    queryFn: () => activityService.listUserActivities(page, pageSize),
    enabled: activeTab === "feed",
  });

  const { data: auditData, isLoading: isLoadingAudit, isError: isErrorAudit, error: errorAudit, refetch: refetchAudit } = useQuery({
    queryKey: QUERY_KEYS.ACTIVITY.AUDIT(page, pageSize),
    queryFn: () => activityService.listAuditLogs(page, pageSize),
    enabled: activeTab === "audit" && !!user?.is_admin,
  });

  const activeData = activeTab === "feed" ? feedData : auditData;
  const isLoading = activeTab === "feed" ? isLoadingFeed : isLoadingAudit;
  const isError = activeTab === "feed" ? isErrorFeed : isErrorAudit;
  const error = activeTab === "feed" ? errorFeed : errorAudit;
  const refetch = activeTab === "feed" ? refetchFeed : refetchAudit;

  const items = activeData?.items || [];
  const total = activeData?.total || 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <>
      <DocumentTitle title={activeTab === "audit" ? "Security Audit Trail" : "Activity Timeline"} />
      <div className="space-y-6">
        <PageHeader
          title={activeTab === "audit" ? "Security Audit Trail" : "Activity Timeline"}
          description="Chronological event history, security audits, and access log stream"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          }
        />

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-2">
          <Button
            variant={activeTab === "feed" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("feed")}
            className="gap-2 h-8 text-xs font-semibold"
          >
            <Activity className="w-3.5 h-3.5" />
            My Activity
          </Button>

          {user?.is_admin && (
            <Button
              variant={activeTab === "audit" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleTabChange("audit")}
              className="gap-2 h-8 text-xs font-semibold"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              Admin Audit Log
            </Button>
          )}
        </div>

        {/* Timeline Table */}
        {isLoading ? (
          <FileListSkeleton rows={8} />
        ) : isError ? (
          <ErrorState error={error} title="Failed to load activity feed" onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-10 h-10 text-muted-foreground/60" />}
            title="No activity recorded"
            description="Your actions and security events will be logged here chronologically."
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold">Action</TableHead>
                    <TableHead className="font-semibold">Resource</TableHead>
                    <TableHead className="font-semibold hidden sm:table-cell">IP Address</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Timestamp</TableHead>
                    <TableHead className="text-right font-semibold">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                          {item.action}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium text-foreground">
                        <span className="text-xs">{item.resource_type}</span>
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          {item.resource_id.slice(0, 8)}...
                        </span>
                      </TableCell>

                      <TableCell className="text-muted-foreground font-mono text-xs hidden sm:table-cell">
                        {item.ip_address || "—"}
                      </TableCell>

                      <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                        {formatDate(item.created_at)}
                      </TableCell>

                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(item.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} ({total} total entries)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 gap-1 text-xs"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default ActivityPage;
