import { Container } from "@devmentor/ui/frontend/container";

export default function HomePage() {
  return (
    <main className="py-24">
      <Container className="flex flex-col items-start gap-6">
        <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">DevMentor</span>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Grow as a developer, with a mentor at your side.
        </h1>
        <p className="max-w-xl text-lg text-ink/70">
          The public site is styled with Tailwind CSS. The admin area at <code>/backend</code> is built
          with shadcn/ui.
        </p>
        <a
          href="/backend"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-ink/85"
        >
          Open backend
        </a>
      </Container>
    </main>
  );
}
