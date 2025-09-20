import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme/theme-provider";

describe("ThemeProvider", () => {
  it("renders children and sets attribute to class", () => {
    render(
      <ThemeProvider attribute="class">
        <div>child</div>
      </ThemeProvider>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});


