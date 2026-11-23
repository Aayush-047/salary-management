import type { EmployeeListQuery } from "@salary/shared";
import { Badge, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { useMeta } from "../../api/queries";
import { FilterModal, type FilterValues } from "../employees/FilterModal";
import { activeFilterCount } from "../employees/filters";
import { filterChange } from "../employees/url-state";

type Filters = Pick<EmployeeListQuery, "status" | "country" | "department" | "jobTitle" | "level">;

/** The Filters button and modal shared by every Insights tab (same filters as the list). */
export function InsightFilters({
  filters,
  onApply,
}: {
  filters: Filters;
  onApply: (change: Partial<Filters>) => void;
}) {
  const [opened, modal] = useDisclosure(false);
  const meta = useMeta();
  const count = activeFilterCount(filters);

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconFilter size={16} />}
        rightSection={
          count > 0 ? (
            <Badge size="sm" circle aria-label={`${count} filters applied`}>
              {count}
            </Badge>
          ) : null
        }
        onClick={modal.open}
      >
        Filters
      </Button>
      <FilterModal
        opened={opened}
        initial={filters}
        meta={meta.data}
        onClose={modal.close}
        onApply={(values: FilterValues) => {
          onApply(filterChange(values));
          modal.close();
        }}
      />
    </>
  );
}
