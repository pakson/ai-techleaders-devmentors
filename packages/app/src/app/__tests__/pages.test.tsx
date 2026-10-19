import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import BackendLayout, { metadata as backendMetadata } from "../(backend)/layout";
import BackendDashboardPage, { metadata as dashboardMetadata } from "../(backend)/backend/page";
import FrontendLayout, { metadata as frontendMetadata } from "../(frontend)/layout";
import HomePage from "../(frontend)/page";

const execute = vi.fn();
vi.mock("@/di/container", () => ({
  createRequestScope: async () => ({ cradle: { em: { execute } } }),
}));
// `connection()` needs a Next.js request scope; it only opts the page into dynamic rendering.
const connection = vi.fn(async () => undefined);
vi.mock("next/server", () => ({ connection: () => connection() }));

describe("frontend", () => {
  it("renders the root layout around the page", () => {
    const html = renderToStaticMarkup(
      <FrontendLayout>
        <p>child</p>
      </FrontendLayout>,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<p>child</p>");
    expect(frontendMetadata.title).toBe("DevMentor");
  });

  it("renders the home page with a link to the backend", () => {
    const html = renderToStaticMarkup(<HomePage />);
    expect(html).toContain("Grow as a developer, with a mentor at your side.");
    expect(html).toContain('href="/backend"');
  });
});

describe("backend", () => {
  it("renders the root layout and keeps the admin out of search engines", () => {
    const html = renderToStaticMarkup(
      <BackendLayout>
        <p>child</p>
      </BackendLayout>,
    );
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<p>child</p>");
    expect(backendMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("renders the dashboard at request time with a connected database", async () => {
    execute.mockResolvedValue([{ "?column?": 1 }]);
    const html = renderToStaticMarkup(await BackendDashboardPage());
    expect(connection).toHaveBeenCalled();
    expect(dashboardMetadata.title).toBe("Dashboard");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Connected");
    expect(html).not.toContain("The database check failed");
  });

  it("shows the database as unavailable without leaking details", async () => {
    execute.mockRejectedValue(new Error("password authentication failed"));
    const html = renderToStaticMarkup(await BackendDashboardPage());
    expect(html).toContain("Unavailable");
    expect(html).toContain("The database check failed. Details are in the server log.");
    expect(html).not.toContain("password");
  });
});
