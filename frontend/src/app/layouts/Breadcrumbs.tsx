import { ChevronRight, HardDrive } from "lucide-react";
import { Link } from "react-router-dom";
import { BreadcrumbItem } from "../../types";
import { ROUTES } from "../config/constants";

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  rootLabel?: string;
}

export function Breadcrumbs({ items = [], rootLabel = "My Files" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center space-x-1.5 text-xs text-muted-foreground select-none overflow-x-auto py-1">
      <Link
        to={ROUTES.FILES}
        className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors shrink-0"
      >
        <HardDrive className="w-3.5 h-3.5 text-primary" />
        <span>{rootLabel}</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={item.id || index} className="flex items-center space-x-1.5 shrink-0">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            {isLast || !item.id ? (
              <span className="font-semibold text-foreground truncate max-w-[150px] sm:max-w-[200px]" title={item.name}>
                {item.name}
              </span>
            ) : (
              <Link
                to={ROUTES.FOLDER_DETAIL(item.id)}
                className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[160px]"
                title={item.name}
              >
                {item.name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
