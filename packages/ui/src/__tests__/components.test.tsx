import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Badge } from "../components/badge";
import { Button } from "../components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/card";
import { Separator } from "../components/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/table";
import { Container } from "../frontend/container";
import { cn } from "../lib/utils";

const render = renderToStaticMarkup;

describe("cn", () => {
  it("joins class names and skips falsy ones", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });
});

describe("Badge", () => {
  it("renders a span with the default variant", () => {
    const html = render(<Badge>New</Badge>);
    expect(html).toMatch(/^<span data-slot="badge" data-variant="default" class="[^"]*bg-primary/);
    expect(html).toContain(">New</span>");
  });

  it("renders the given variant onto its child with asChild", () => {
    const html = render(
      <Badge variant="destructive" asChild className="extra">
        <a href="/x">Link</a>
      </Badge>,
    );
    expect(html).toMatch(/^<a href="\/x" data-slot="badge" data-variant="destructive" /);
    expect(html).toMatch(/class="[^"]*bg-destructive\/10[^"]* extra"/);
  });
});

describe("Button", () => {
  it("renders a button with the default variant and size", () => {
    const html = render(<Button type="submit">Save</Button>);
    expect(html).toContain('<button data-slot="button" data-variant="default" data-size="default"');
    expect(html).toContain('type="submit"');
  });

  it("renders the given variant and size onto its child with asChild", () => {
    const html = render(
      <Button variant="outline" size="sm" asChild>
        <a href="/x">Go</a>
      </Button>,
    );
    expect(html).toMatch(/^<a href="\/x" data-slot="button" data-variant="outline" data-size="sm"/);
  });
});

describe("Card", () => {
  it("renders every slot", () => {
    const html = render(
      <Card size="sm" className="extra">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(html).toMatch(/^<div data-slot="card" data-size="sm" class="[^"]*extra/);
    for (const slot of ["header", "title", "description", "action", "content", "footer"]) {
      expect(html).toContain(`data-slot="card-${slot}"`);
    }
  });

  it("defaults to the default size", () => {
    expect(render(<Card />)).toContain('data-size="default"');
  });
});

describe("Separator", () => {
  it("renders a decorative horizontal separator by default", () => {
    const html = render(<Separator />);
    expect(html).toContain('data-slot="separator"');
    expect(html).toContain('data-orientation="horizontal"');
    expect(html).toContain('role="none"');
  });

  it("renders a semantic vertical separator", () => {
    const html = render(<Separator orientation="vertical" decorative={false} />);
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-orientation="vertical"');
  });
});

describe("Table", () => {
  it("renders every slot inside a scroll container", () => {
    const html = render(
      <Table>
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(html).toMatch(/^<div data-slot="table-container"[^>]*><table data-slot="table"/);
    for (const slot of ["caption", "header", "body", "footer", "row", "head", "cell"]) {
      expect(html).toContain(`data-slot="table-${slot}"`);
    }
  });
});

describe("Container", () => {
  it("merges its classes with the caller's", () => {
    expect(render(<Container className="py-4">x</Container>)).toBe(
      '<div class="mx-auto w-full max-w-5xl px-6 py-4">x</div>',
    );
  });
});
