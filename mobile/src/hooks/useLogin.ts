import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { apiFetch } from "@/lib/api-client";
import { setToken } from "@/lib/auth-storage";
import type { TokenResponse } from "@/lib/types";

interface LoginInput {
  email: string;
  password: string;
}

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<TokenResponse>("/auth/login", { method: "POST", body: input, auth: false }),
    onSuccess: async (data) => {
      await setToken(data.access_token);
      router.replace("/venta");
    },
  });
}
