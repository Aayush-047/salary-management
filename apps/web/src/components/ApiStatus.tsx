import { Badge } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api/client";

export function ApiStatus() {
  const { isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<{ status: string }>("/health"),
    refetchInterval: 30_000,
    retry: false,
  });

  if (isPending) return <Badge color="gray">Checking API…</Badge>;
  if (isError) return <Badge color="red">API offline</Badge>;
  return <Badge color="green">API online</Badge>;
}
