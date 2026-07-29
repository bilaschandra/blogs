export function SectionBanner({ title }: { title: string }) {
  return (
    <div className="bg-uber-banner">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="font-heading text-4xl font-bold text-black">{title}</h1>
      </div>
    </div>
  );
}
