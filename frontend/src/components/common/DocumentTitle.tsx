import { useEffect } from "react";
import { env } from "../../app/config/env";

export interface DocumentTitleProps {
  title: string;
}

export function DocumentTitle({ title }: DocumentTitleProps) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | ${env.appName}` : env.appName;

    return () => {
      document.title = prevTitle;
    };
  }, [title]);

  return null;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${env.appName}` : env.appName;
  }, [title]);
}
