import { afterAll, afterEach, describe, expect, inject, it } from "vitest";

import { browser, getText, screenshot } from "./agent-browser";

const baseUrl = inject("baseUrl");

describe("smoke", () => {
  // Evidence of a failure: the page the browser was on when the test failed.
  afterEach(async ({ task }) => {
    if (task.result?.state === "fail") await screenshot(`failed-${task.name}`);
  });

  afterAll(async () => {
    await browser("close");
  });

  it("renders the public home page", async () => {
    await browser("open", `${baseUrl}/`);
    expect(await getText("h1")).toContain("Grow as a developer");
    await screenshot("01-home-page");
  });

  it("navigates to the backend dashboard and shows a connected database", async () => {
    await browser("open", `${baseUrl}/`);
    await browser("click", "a[href='/backend']");
    await browser("wait", "--text", "Connected");
    expect(await getText("h1")).toBe("Dashboard");
    await screenshot("02-backend-dashboard-connected");
  });

  it("serves the health endpoint", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    await browser("open", `${baseUrl}/api/health`);
    await screenshot("03-health-endpoint");
  });
});
