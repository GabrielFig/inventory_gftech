import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { SaleCreate, SaleRead } from "@/lib/types";

export function useRegisterSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaleCreate) => apiFetch<SaleRead>("/sales", { method: "POST", body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
