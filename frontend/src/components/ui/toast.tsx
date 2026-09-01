import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "../../hooks/useTheme";
import { notify } from "./notify";

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      theme={theme as "light" | "dark"}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        className: "border border-border bg-card text-card-foreground shadow-lg",
        duration: 4000,
      }}
    />
  );
}

export { notify };
