import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlayerFormExample from "@/app/players/form-example/page";

describe("Form example", () => {
  it("validates and submits", async () => {
    render(<PlayerFormExample />);
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findAllByText(/must be at least/i)).toHaveLength(1);
    await userEvent.type(screen.getByLabelText(/name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
  });
});


