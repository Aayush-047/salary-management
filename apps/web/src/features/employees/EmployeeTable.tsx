import type { EmployeeListItem, EmployeeListQuery, EmployeeSortField } from "@salary/shared";
import { Anchor, Badge, Skeleton, Table, Text, Tooltip, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useMoney, type ShownMoney } from "../../components/display-currency-context";
import { backLinkState } from "../../lib/back-link";

type Money = (amount: number, currency: string) => ShownMoney;

/** An amount; when converted, hovering shows the original. */
function MoneyCell({ shown }: { shown: ShownMoney }) {
  if (!shown.converted) return <>{shown.text}</>;
  return (
    <Tooltip label={`${shown.original} (local)`} withArrow>
      <span>{shown.text}</span>
    </Tooltip>
  );
}

type Column = {
  key: string;
  label: string;
  sortField?: EmployeeSortField;
  numeric?: boolean;
  render: (e: EmployeeListItem, money: Money) => ReactNode;
};

const COLUMNS: Column[] = [
  { key: "code", label: "Code", sortField: "employeeCode", render: (e) => e.employeeCode },
  {
    key: "name",
    label: "Name",
    sortField: "name",
    render: (e) => (
      <>
        {/* A div, not the default <p>: the badge renders a <div>, which a <p> cannot contain. */}
        <Text component="div" size="sm" fw={500}>
          {e.firstName} {e.lastName}{" "}
          {e.status === "TERMINATED" && (
            <Badge size="xs" color="gray" variant="light">
              Left {e.terminationDate}
            </Badge>
          )}
        </Text>
        <Text size="xs" c="dimmed">
          {e.email}
        </Text>
      </>
    ),
  },
  { key: "country", label: "Country", render: (e) => e.country.name },
  {
    key: "role",
    label: "Role",
    render: (e) => (
      <>
        <Text size="sm">{e.jobTitle}</Text>
        <Text size="xs" c="dimmed">
          {e.department}
        </Text>
      </>
    ),
  },
  { key: "level", label: "Level", sortField: "level", render: (e) => `L${e.level}` },
  {
    key: "base",
    label: "Base",
    sortField: "baseSalary",
    numeric: true,
    render: (e, money) => <MoneyCell shown={money(e.baseSalary, e.currency)} />,
  },
  {
    key: "bonus",
    label: "Target bonus",
    numeric: true,
    render: (e, money) => <MoneyCell shown={money(e.targetBonus, e.currency)} />,
  },
  {
    key: "total",
    label: "Total cash",
    sortField: "totalCash",
    numeric: true,
    render: (e, money) => <MoneyCell shown={money(e.totalCash, e.currency)} />,
  },
  { key: "hired", label: "Hired", sortField: "hireDate", render: (e) => e.hireDate },
];

type Props = {
  items: EmployeeListItem[] | undefined;
  loading: boolean;
  query: EmployeeListQuery;
  /** Toggles sorting by this field (the direction is decided from the current URL). */
  onSort: (sortBy: EmployeeSortField) => void;
};

function SortableHeader({
  column,
  query,
  onSort,
}: { column: Column } & Pick<Props, "query" | "onSort">) {
  const field = column.sortField!;
  const active = query.sortBy === field;
  const nextDir = active && query.sortDir === "asc" ? "desc" : "asc";
  return (
    <UnstyledButton
      onClick={() => onSort(field)}
      fw={600}
      fz="sm"
      aria-label={`Sort by ${column.label} ${nextDir === "asc" ? "ascending" : "descending"}`}
    >
      {column.label} {active ? (query.sortDir === "asc" ? "▲" : "▼") : ""}
    </UnstyledButton>
  );
}

export function EmployeeTable({ items, loading, query, onSort }: Props) {
  const money = useMoney();
  const navigate = useNavigate();
  // Carried to the detail page so its "Back" link restores this filtered, sorted page.
  const linkState = backLinkState(`/employees${useLocation().search}`, "Back to employees");
  const detailPath = (e: EmployeeListItem) => `/employees/${e.employeeCode}`;

  const rows = loading
    ? Array.from({ length: 8 }, (_, i) => (
        <Table.Tr key={`skeleton-${i}`}>
          {COLUMNS.map((c) => (
            <Table.Td key={c.key}>
              <Skeleton height={14} />
            </Table.Td>
          ))}
        </Table.Tr>
      ))
    : (items ?? []).map((employee) => (
        <Table.Tr
          key={employee.id}
          onClick={() => navigate(detailPath(employee), { state: linkState })}
          style={{ cursor: "pointer" }}
        >
          {COLUMNS.map((c) => (
            <Table.Td key={c.key} ta={c.numeric ? "right" : undefined}>
              {c.key === "code" ? (
                <Anchor
                  component={Link}
                  to={detailPath(employee)}
                  state={linkState}
                  onClick={(event) => event.stopPropagation()}
                >
                  {employee.employeeCode}
                </Anchor>
              ) : (
                c.render(employee, money)
              )}
            </Table.Td>
          ))}
        </Table.Tr>
      ));

  return (
    <Table.ScrollContainer minWidth={1000}>
      <Table striped highlightOnHover verticalSpacing="xs" aria-label="Employees">
        <Table.Thead>
          <Table.Tr>
            {COLUMNS.map((c) => (
              <Table.Th key={c.key} ta={c.numeric ? "right" : undefined}>
                {c.sortField ? (
                  <SortableHeader column={c} query={query} onSort={onSort} />
                ) : (
                  c.label
                )}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
