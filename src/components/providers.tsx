"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { DataProvider } from "@/lib/store";
import { setupDevice } from "@/lib/device";

export function Providers({ children }: { children: React.ReactNode }) {
  // Service worker (avisos) e pedido de instalação do app.
  useEffect(() => setupDevice(), []);

  return (
    <DataProvider>
      {children}
      <Toaster position="bottom-right" mobileOffset={{ bottom: 88 }} theme="system" closeButton />
    </DataProvider>
  );
}
