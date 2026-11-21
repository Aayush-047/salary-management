import { Text, Title } from "@mantine/core";

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <Title order={2}>{title}</Title>
      <Text c="dimmed" mt="sm">
        Coming soon.
      </Text>
    </>
  );
}
