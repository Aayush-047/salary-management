import type { AuditAction, AuditLogQuery } from "@salary/shared";
import {
  Alert,
  Group,
  Loader,
  Pagination,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useAuditLog } from "../../api/queries";
import { backLinkState } from "../../lib/back-link";
import { latestSearchParams } from "../../lib/search-params";
import { AuditItem } from "../employee-detail/AuditHistory";
import { stateParams } from "../insights/tab-state";
import { ACTION_FILTERS, DEFAULT_AUDIT, parseAuditLog } from "./audit-state";

const SEARCH_DEBOUNCE_MS = 300;

/** Every change made in the app: who, when, what and why. */
export function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const state = parseAuditLog(params);
  const log = useAuditLog(state);

  const update = (change: Partial<AuditLogQuery>, options?: { replace?: boolean }) => {
    const latest = parseAuditLog(latestSearchParams());
    const next = { ...latest, ...change, page: "page" in change ? (change.page ?? 1) : 1 };
    setParams(stateParams(next, DEFAULT_AUDIT), options);
  };

  // Typing updates the box at once and the URL after a pause.
  const [searchText, setSearchText] = useState(state.search ?? "");
  const [debounced] = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if ((state.search ?? "") !== debounced.trim()) {
      update({ search: debounced.trim() || undefined }, { replace: true });
    }
    // Only react to typing, not to every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const linkState = backLinkState(`${location.pathname}${location.search}`, "Back to audit log");
  const filtered = Boolean(state.search || state.action || state.from || state.to);
  const data = log.data;

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Audit log</Title>
        <Text c="dimmed" size="sm">
          Every change made in the app: who made it, when, what changed and why.
        </Text>
      </div>

      <Group align="flex-end" gap="sm" wrap="wrap">
        <TextInput
          label="Employee"
          placeholder="Name or code"
          leftSection={<IconSearch size={16} />}
          rightSection={searchText.trim() !== (state.search ?? "") ? <Loader size="xs" /> : null}
          value={searchText}
          onChange={(e) => setSearchText(e.currentTarget.value)}
          w={240}
        />
        <SegmentedControl
          aria-label="Type of change"
          value={state.action ?? "ALL"}
          onChange={(value) =>
            update({ action: value === "ALL" ? undefined : (value as AuditAction) })
          }
          data={ACTION_FILTERS}
        />
        <TextInput
          type="date"
          label="From"
          value={state.from ?? ""}
          onChange={(e) => update({ from: e.currentTarget.value || undefined })}
          w={160}
        />
        <TextInput
          type="date"
          label="To"
          value={state.to ?? ""}
          onChange={(e) => update({ to: e.currentTarget.value || undefined })}
          w={160}
        />
      </Group>

      {log.isError ? (
        <Alert color="red" title="Couldn't load the audit log">
          {log.error.message}
        </Alert>
      ) : !data ? (
        <Skeleton height={240} />
      ) : data.total === 0 ? (
        <Text c="dimmed">
          {filtered
            ? "No changes match these filters."
            : "No changes recorded yet. Records loaded before go-live have no history here; changes made in the app (including imports) appear as they happen."}
        </Text>
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {data.total.toLocaleString("en-US")} {data.total === 1 ? "change" : "changes"}, newest
            first
          </Text>
          <Stack gap="sm" style={{ opacity: log.isPlaceholderData ? 0.6 : 1 }}>
            {data.items.map((entry) => (
              <AuditItem
                key={entry.id}
                entry={entry}
                employee={{
                  employeeCode: entry.employee.employeeCode,
                  name: `${entry.employee.firstName} ${entry.employee.lastName}`,
                  linkState,
                }}
              />
            ))}
          </Stack>
          {data.totalPages > 1 && (
            <Pagination
              total={data.totalPages}
              value={data.page}
              onChange={(page) => update({ page })}
              size="sm"
            />
          )}
        </>
      )}
    </Stack>
  );
}
