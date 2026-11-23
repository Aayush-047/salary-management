import { Badge, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

/** After this long without an answer, the API is probably starting up from sleep. */
const SLOW_MS = 3_000;

export function ApiStatus() {
  const { isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<{ status: string }>("/health"),
    refetchInterval: 30_000,
    // A sleeping free-tier server can fail its first requests while it wakes.
    retry: 3,
    retryDelay: 5_000,
  });

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!isPending) return;
    const timer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(timer);
  }, [isPending]);

  if (isPending) {
    return slow ? (
      <Tooltip label="Free hosting sleeps when idle; the first request can take up to a minute.">
        <Badge color="yellow">API waking up…</Badge>
      </Tooltip>
    ) : (
      <Badge color="gray">Checking API…</Badge>
    );
  }
  if (isError) return <Badge color="red">API offline</Badge>;
  return <Badge color="green">API online</Badge>;
}
