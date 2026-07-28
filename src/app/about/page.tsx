import { SectionBanner } from "@/components/SectionBanner";

export default function AboutPage() {
  return (
    <main>
      <SectionBanner title="About" />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-gray-600">
          This is a personal engineering blog — notes on building things,
          written by one person, for anyone who finds them useful.
        </p>
      </div>
    </main>
  );
}
