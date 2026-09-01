import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../src/App";

describe("App Root Application", () => {
  it("mounts App successfully and renders authentication/brand layout", async () => {
    render(<App />);
    // When unauthenticated, App redirects to /login and renders the SecStorage brand
    const elements = await screen.findAllByText(/SecStorage/i);
    expect(elements.length).toBeGreaterThan(0);
  });
});
