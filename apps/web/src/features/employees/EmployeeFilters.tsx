import type { EmployeeListQuery, MetaResponse } from "@salary/shared";
import { Button, Group, MultiSelect, SegmentedControl, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState } from "react";

type Props = {
  query: EmployeeListQuery;
  meta: MetaResponse | undefined;
  showClear: boolean;
  onChange: (change: Partial<EmployeeListQuery>, options?: { replace?: boolean }) => void;
  onClear: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function EmployeeFilters({ query, meta, showClear, onChange, onClear }: Props) {
  // Local text so typing feels instant; the URL (and the request) updates after a pause.
  const [searchText, setSearchText] = useState(query.search ?? "");
  const [debouncedSearch] = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if ((query.search ?? "") !== debouncedSearch.trim()) {
      onChange({ search: debouncedSearch.trim() }, { replace: true });
    }
    // Only react to the user's typing, not to every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep the box in sync when the URL changes elsewhere (Clear filters, back button).
  // Adjusting state during render (React's recommended pattern) avoids an extra effect pass;
  // comparing trimmed text keeps a trailing space the user is still typing.
  const urlSearch = query.search ?? "";
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    if (urlSearch !== searchText.trim()) setSearchText(urlSearch);
  }

  const countries = (meta?.countries ?? []).map((c) => ({ value: c.code, label: c.name }));
  const departments = (meta?.departments ?? []).map((d) => d.name);
  // Narrow the title list to the selected departments, if any.
  const jobTitles = (meta?.departments ?? [])
    .filter((d) => !query.department || query.department.includes(d.name))
    .flatMap((d) => d.jobTitles)
    .sort();
  const levels = (meta?.levels ?? []).map((l) => ({ value: String(l), label: `L${l}` }));

  return (
    <Group align="flex-end" gap="sm" wrap="wrap">
      <TextInput
        label="Search"
        placeholder="Name, email or employee code"
        value={searchText}
        onChange={(e) => setSearchText(e.currentTarget.value)}
        w={260}
        aria-label="Search employees"
      />
      <MultiSelect
        label="Country"
        placeholder="All"
        data={countries}
        value={query.country ?? []}
        onChange={(country) => onChange({ country })}
        searchable
        clearable
        w={200}
      />
      <MultiSelect
        label="Department"
        placeholder="All"
        data={departments}
        value={query.department ?? []}
        onChange={(department) => onChange({ department })}
        searchable
        clearable
        w={200}
      />
      <MultiSelect
        label="Job title"
        placeholder="All"
        data={jobTitles}
        value={(query.jobTitle ?? []).filter((t) => jobTitles.includes(t))}
        onChange={(jobTitle) => onChange({ jobTitle })}
        searchable
        clearable
        w={220}
      />
      <MultiSelect
        label="Level"
        placeholder="All"
        data={levels}
        value={(query.level ?? []).map(String)}
        onChange={(level) => onChange({ level: level.map(Number) })}
        clearable
        w={150}
      />
      <SegmentedControl
        aria-label="Employment status"
        value={query.status}
        onChange={(status) => onChange({ status: status as EmployeeListQuery["status"] })}
        data={[
          { value: "ACTIVE", label: "Active" },
          { value: "TERMINATED", label: "Terminated" },
          { value: "ALL", label: "All" },
        ]}
      />
      {showClear && (
        <Button variant="subtle" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </Group>
  );
}
