import { Stack, Tabs, Text, Title } from "@mantine/core";
import { useSearchParams } from "react-router";
import { ExplorerTab } from "./ExplorerTab";
import { OutliersTab } from "./OutliersTab";
import { RecentChangesTab } from "./RecentChangesTab";

const TABS = ["explorer", "outliers", "changes"] as const;
type Tab = (typeof TABS)[number];

/** Insights: answers to "how does the organisation pay people?". The tab lives in the URL. */
export function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "explorer";

  // Filters carry over between tabs; tab-specific settings start fresh.
  const switchTab = (next: string | null) => {
    if (!next) return;
    const kept = new URLSearchParams();
    kept.set("tab", next);
    for (const key of ["status", "country", "department", "jobTitle", "level"]) {
      for (const value of params.getAll(key)) kept.append(key, value);
    }
    setParams(kept);
  };

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Insights</Title>
        <Text c="dimmed" size="sm">
          How the organisation pays people. Leavers are excluded unless you include them in Filters.
        </Text>
      </div>
      <Tabs value={tab} onChange={switchTab} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="explorer">Pay explorer</Tabs.Tab>
          <Tabs.Tab value="outliers">Outliers</Tabs.Tab>
          <Tabs.Tab value="changes">Recent changes</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="explorer" pt="md">
          <ExplorerTab />
        </Tabs.Panel>
        <Tabs.Panel value="outliers" pt="md">
          <OutliersTab />
        </Tabs.Panel>
        <Tabs.Panel value="changes" pt="md">
          <RecentChangesTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
