import { render, screen } from "@testing-library/react";
import { BottomNav } from "@/components/navigation/BottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("BottomNav", () => {
  it("renders 5 nav items and sets aria-current on active", () => {
    render(<BottomNav />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });
});


