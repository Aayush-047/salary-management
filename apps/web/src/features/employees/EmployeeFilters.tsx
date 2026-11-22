import type { EmployeeListQuery, MetaResponse } from "@salary/shared";
import { Badge, Button, CloseButton, Group, Loader, TextInput } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { FilterModal, type FilterValues } from "./FilterModal";
import { activeFilterCount } from "./filters";
import { filterChange } from "./url-state";

type Props = {
  query: EmployeeListQuery;
  meta: MetaResponse | undefined;
  /** True while employee results are being fetched. */
  fetching: boolean;
  onChange: (change: Partial<EmployeeListQuery>, options?: { replace?: boolean }) => void;
};

const SEARCH_DEBOUNCE_MS = 300;

/** Search box plus a Filters button; the filters themselves are edited in a modal. */
export function EmployeeFilters({ query, meta, fetching, onChange }: Props) {
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

  // Keep the box in sync when the URL changes elsewhere (Clear filters, back button).
  // Adjusting state during render (React's recommended pattern) avoids an extra effect pass;
  // comparing trimmed text keeps a trailing space the user is still typing.
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    if (urlSearch !== searchText.trim()) setSearchText(urlSearch);
  }

  // Spin while waiting for the user to pause, and while search results load.
  const searching = searchText.trim() !== urlSearch || (fetching && urlSearch !== "");
  const filterCount = activeFilterCount(query);

  const applyFilters = (values: FilterValues) => {
    onChange(filterChange(values));
    modal.close();
  };

  return (
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
          filterCount > 0 ? (
            <Badge size="sm" circle aria-label={`${filterCount} filters applied`}>
              {filterCount}
            </Badge>
          ) : null
        }
        onClick={modal.open}
      >
        Filters
      </Button>

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
    </Group>
  );
}
