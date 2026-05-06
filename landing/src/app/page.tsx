import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
        Sloopquest
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Marine surveys, simplified. Capture findings on the water and ship
        polished reports the same day.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/pricing">See pricing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/about">Learn more</Link>
        </Button>
      </div>
    </main>
  );
}
