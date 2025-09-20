import { render } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";
import { axe } from "vitest-axe";

describe("a11y", () => {
  it("AppShell has no basic violations", async () => {
    const { container } = render(
      <AppShell>
        <p>content</p>
      </AppShell>
    );
    const results = await axe(container);
    expect(results.violations.length).toBe(0);
  });
});


