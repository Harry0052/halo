import { STATUS_WORDS } from "@/lib/status-words";

export function StatusLegend() {
  return (
    <section aria-labelledby="status-words" className="mt-12">
      <h2 id="status-words" className="font-display text-3xl tracking-tight text-midnight sm:text-4xl">
        These are the only results Halo shows.
      </h2>
      <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
        This legend is not a verification of a request. A real result will appear only after an accepted contact
        answers a check. That answer is not available yet.
      </p>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">
        {STATUS_WORDS.map((item) => (
          <li key={item.word} className="rounded-[1.4rem] bg-midnight px-5 py-6 text-pale">
            <p className="font-display text-4xl leading-none tracking-tight text-teal">{item.word}</p>
            <p className="mt-4 text-sm leading-6 text-pale/85">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
