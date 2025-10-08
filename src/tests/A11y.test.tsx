import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

describe("a11y", () => {
  it("Basic navigation structure has no violations", async () => {
    const { container } = render(
      <div className="min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <header 
          className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          role="banner"
        >
          <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <button
                className="flex items-center space-x-2 font-semibold text-lg"
                aria-label="Group menu"
                aria-expanded={false}
              >
                <span>Test Group</span>
              </button>
            </div>
            
            <nav className="hidden sm:flex items-center space-x-1" role="navigation" aria-label="Main navigation">
              <a href="/players">
                <button
                  className="flex items-center gap-2"
                  aria-current={undefined}
                >
                  <span>Players</span>
                </button>
              </a>
              <a href="/stats">
                <button
                  className="flex items-center gap-2"
                  aria-current={undefined}
                >
                  <span>Stats</span>
                </button>
              </a>
            </nav>
            
            <nav className="flex items-center space-x-2" role="navigation" aria-label="User navigation">
              <button
                className="flex items-center gap-2 text-sm"
                aria-expanded={false}
                aria-haspopup="true"
              >
                <span>User Menu</span>
              </button>
            </nav>
          </div>
        </header>
        <main id="main-content" className="flex-1">
          <p>Main content</p>
        </main>
      </div>
    );
    const results = await axe(container);
    expect(results.violations.length).toBe(0);
  });
});


