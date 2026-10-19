import { afterAll, describe, expect, inject, it } from "vitest";

import { browser, getText } from "./agent-browser";

const baseUrl = inject("baseUrl");

describe("smoke", () => {
  afterAll(async () => {
    await browser("close");
  });

  it("renders the public home page", async () => {
    await browser("open", `${baseUrl}/`);
    expect(await getText("h1")).toContain("Grow as a developer");
  });

  it("navigates to the backend dashboard and shows a connected database", async () => {
    await browser("open", `${baseUrl}/`);
    await browser("click", "a[href='/backend']");
    await browser("wait", "--text", "Connected");
    expect(await getText("h1")).toBe("Dashboard");
  });

  it("serves the health endpoint", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
