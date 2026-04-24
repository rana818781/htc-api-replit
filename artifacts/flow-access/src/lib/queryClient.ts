import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => {
  try {
    return localStorage.getItem("veoflowapi_token");
  } catch {
    return null;
  }
});

function handleApiError(error: unknown): void {
  const status = (error as { status?: number } | null)?.status;
  if (status === 401) {
    if (localStorage.getItem("veoflowapi_token")) {
      window.dispatchEvent(new Event("veoflowapi:unauthorized"));
    }
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { status?: number } | null)?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 1;
      },
    },
  },
  queryCache: new QueryCache({ onError: handleApiError }),
  mutationCache: new MutationCache({ onError: handleApiError }),
});
