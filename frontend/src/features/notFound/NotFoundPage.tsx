import { Link } from "react-router-dom";
import { HardDrive, ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "../../components/ui/button";
import { DocumentTitle } from "../../components/common/DocumentTitle";
import { ROUTES } from "../../app/config/constants";

export function NotFoundPage() {
  return (
    <>
      <DocumentTitle title="Page Not Found (404)" />
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-muted-foreground mx-auto shadow-inner">
            <FileQuestion className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-4xl font-extrabold text-primary font-mono">404</span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Resource Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The file path, directory, or page you are looking for does not exist or has been moved.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to={ROUTES.FILES}>
              <Button variant="default" className="gap-2 shadow-sm">
                <HardDrive className="w-4 h-4" />
                Go to My Files
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default NotFoundPage;
