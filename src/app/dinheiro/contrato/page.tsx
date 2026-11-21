"use client";

import { Suspense } from "react";
import { ContractGenerator } from "@/components/contract-generator";

export default function GerarContratoPage() {
  return (
    <Suspense>
      <ContractGenerator />
    </Suspense>
  );
}
