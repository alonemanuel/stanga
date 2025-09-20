import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell", () => {
  it("renders skip link and main landmark", () => {
    render(
      <AppShell>
        <div>Child</div>
      </AppShell>
    );
    const skip = screen.getByText(/skip to content/i);
    expect(skip).toBeInTheDocument();
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
  });
});


