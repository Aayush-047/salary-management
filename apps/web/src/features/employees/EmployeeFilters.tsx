import type { EmployeeListQuery, MetaResponse } from "@salary/shared";
import { Badge, Button, CloseButton, Group, Loader, Pill, Stack, TextInput } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { filterChips } from "./filter-chips";
import { FilterModal, type FilterValues } from "./FilterModal";
import { filterChange } from "./url-state";

type Props = {
  query: EmployeeListQuery;
  meta: MetaResponse | undefined;
  /** True while employee results are being fetched. */
  fetching: boolean;
  onChange: (change: Partial<EmployeeListQuery>, options?: { replace?: boolean }) => void;
  onClear: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function EmployeeFilters({ query, meta, fetching, onChange, onClear }: Props) {
  const [modalOpened, modal] = useDisclosure(false);

  // Local text so typing feels instant; the URL (and the request) updates after a pause.
  const [searchText, setSearchText] = useState(query.search ?? "");
  const [debouncedSearch] = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS);
  const urlSearch = query.search ?? "";

  useEffect(() => {
    if (urlSearch !== debouncedSearch.trim()) {
      onChange({ search: debouncedSearch.trim() }, { replace: true });
    }
    // Only react to the user's typing, not to every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep the box in sync when the URL changes elsewhere (Clear all, back button).
  // Adjusting state during render (React's recommended pattern) avoids an extra effect pass;
  // comparing trimmed text keeps a trailing space the user is still typing.
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    if (urlSearch !== searchText.trim()) setSearchText(urlSearch);
  }

  // Spin while waiting for the user to pause, and while search results load.
  const searching = searchText.trim() !== urlSearch || (fetching && urlSearch !== "");
  const chips = filterChips(query, meta);

  const applyFilters = (values: FilterValues) => {
    onChange(filterChange(values));
    modal.close();
  };

  return (
    <Stack gap="xs">
      <Group gap="sm" wrap="nowrap">
        <TextInput
          placeholder="Search name, email or employee code"
          aria-label="Search employees"
          value={searchText}
          onChange={(e) => setSearchText(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={
            searching ? (
              <Loader size="xs" aria-label="Searching" />
            ) : searchText ? (
              <CloseButton size="sm" aria-label="Clear search" onClick={() => setSearchText("")} />
            ) : null
          }
          w={360}
        />
        <Button
          variant="default"
          leftSection={<IconFilter size={16} />}
          rightSection={
            chips.length > 0 ? (
              <Badge size="sm" circle aria-label={`${chips.length} filters applied`}>
                {chips.length}
              </Badge>
            ) : null
          }
          onClick={modal.open}
        >
          Filters
        </Button>
      </Group>

      {chips.length > 0 && (
        <Group gap="xs" aria-label="Applied filters">
          {chips.map((chip) => (
            <Pill
              key={chip.key}
              withRemoveButton
              onRemove={() => onChange(chip.remove)}
              removeButtonProps={{ "aria-label": `Remove ${chip.label}` }}
            >
              {chip.label}
            </Pill>
          ))}
          <Button variant="subtle" size="compact-sm" onClick={onClear}>
            Clear all
          </Button>
        </Group>
      )}

      <FilterModal
        opened={modalOpened}
        initial={{
          status: query.status,
          country: query.country,
          department: query.department,
          jobTitle: query.jobTitle,
          level: query.level,
        }}
        meta={meta}
        onClose={modal.close}
        onApply={applyFilters}
      />
    </Stack>
  );
}
