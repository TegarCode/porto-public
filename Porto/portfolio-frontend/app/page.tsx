import Image from "next/image";
import Link from "next/link";

const projects = [
  {
    name: "SIDE Analysis",
    href: "/projects/side-analysis",
    problem: "Produk ekspor tidak cukup dibaca dari nilai perdagangan; posisinya perlu dipetakan dari daya saing dan arah pasar.",
    data: "RCA-CMSA, RSCA-TBI, RCA-EPD",
    insight: "Membantu memilih produk prioritas, membaca kuadran kompetitif, dan menyusun narasi strategi ekspor.",
    accent: "bg-teal",
  },
  {
    name: "Benchmark Sentimen",
    href: "/projects/sentiment",
    problem: "Opini pengguna smartphone tersebar dalam teks dan gambar, sehingga insight produk mudah terpecah.",
    data: "ABSA, OCR, TF-IDF, SVM",
    insight: "Mengubah komentar menjadi distribusi aspek yang bisa dibandingkan antar dataset.",
    accent: "bg-rose",
  },
  {
    name: "Scraping Dashboard",
    href: "/projects/scraping",
    problem: "Pengambilan data publik perlu terlihat sebagai pipeline yang bisa dipantau, bukan proses tersembunyi.",
    data: "BPS, TradeMap, status job",
    insight: "Menjelaskan sumber, status, dan preview data agar proses pengumpulan data terasa transparan.",
    accent: "bg-amber",
  },
  {
    name: "Pentaho ETL",
    href: "/projects/pentaho-dashboard",
    problem: "Warehouse penjualan perlu dibaca sebagai cerita bisnis, bukan hanya kumpulan fact table.",
    data: "AdventureWorks, fact_sales, product, territory, time",
    insight: "Membaca region, kategori produk, freight, dan alasan pembelian dalam format BI yang lebih presentatif.",
    accent: "bg-blue",
  },
];

const skills = [
  ["Analysis", "Trade competitiveness, sentiment benchmark, market interpretation"],
  ["Data Pipeline", "Scraping, cleaning, transformation, API integration"],
  ["Visualization", "Story-first charts, matrix views, quadrant reading"],
  ["Stack", "Laravel, Flask, Next.js, React Query, Recharts"],
];

const storySteps = [
  {
    label: "Problem",
    title: "Start from the decision",
    copy: "Setiap project dibuka dari pertanyaan analitis: produk mana yang perlu diprioritaskan, aspek mana yang dipersepsikan baik, atau data apa yang harus dikumpulkan.",
  },
  {
    label: "Data",
    title: "Show the evidence",
    copy: "Visualisasi tidak berdiri sendiri. Chart selalu ditemani konteks sumber, filter, dan metode supaya recruiter maupun reviewer teknis tahu apa yang sedang dibaca.",
  },
  {
    label: "Insight",
    title: "Close with a finding",
    copy: "Output akhirnya bukan dump data, melainkan narasi singkat: posisi produk, sinyal sentimen dominan, dan tindakan analitis berikutnya.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate min-h-[92vh] overflow-hidden border-b border-ink/15">
        <Image
          src="/images/portfolio-hero.png"
          alt="Editorial data analyst workspace with charts and portfolio slides"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#151515]/52" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-between px-6 py-7 text-white md:px-10 lg:px-14">
          <div />

          <div className="max-w-5xl pb-8 pt-24 md:pt-32">
            <p className="mb-5 font-mono text-sm uppercase tracking-[0.24em] text-white/70">
              Data Analyst Portfolio
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] md:text-7xl lg:text-8xl">
              Turning analysis into decisions people can read.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/82 md:text-2xl md:leading-9">
              Portfolio ini menyatukan analisis perdagangan internasional,
              benchmark sentimen, pipeline scraping, dan dashboard ETL dalam
              alur presentasi yang ringkas: masalah, data, lalu insight.
            </p>
          </div>

          <div className="grid max-w-4xl grid-cols-1 border-y border-white/25 py-5 text-white md:grid-cols-3">
            <div className="py-3 md:py-0">
              <p className="text-4xl font-semibold">04</p>
              <p className="mt-1 text-sm text-white/70">project analitik</p>
            </div>
            <div className="border-white/25 py-3 md:border-x md:px-7 md:py-0">
              <p className="text-4xl font-semibold">API</p>
              <p className="mt-1 text-sm text-white/70">gateway integration</p>
            </div>
            <div className="py-3 md:px-7 md:py-0">
              <p className="text-4xl font-semibold">BI</p>
              <p className="mt-1 text-sm text-white/70">story-first charts</p>
            </div>
          </div>
        </div>
      </section>

      <section id="story" className="border-b border-ink/15 bg-paper">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-[0.82fr_1.18fr] md:px-10 lg:px-14">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
              Presentation Flow
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-ink md:text-6xl">
              The page reads like a portfolio deck.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px bg-ink/15 md:grid-cols-3">
            {storySteps.map((step) => (
              <article key={step.label} className="bg-paper p-6 md:min-h-[340px]">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                  {step.label}
                </p>
                <h3 className="mt-8 text-2xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-5 text-base leading-7 text-muted">
                  {step.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="border-b border-ink/15 bg-background">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-14">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
              Project Showcase
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-ink md:text-6xl">
              Four systems, one analytical narrative.
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted">
              Setiap project dirancang untuk memperlihatkan kemampuan teknis
              sekaligus cara berpikir analitis. Chart akan hadir setelah
              konteks, bukan sebagai angka mentah yang berdiri sendiri.
            </p>
          </div>

              <div className="mt-12 grid grid-cols-1 gap-px bg-ink/15 md:grid-cols-2 xl:grid-cols-4">
            {projects.map((project, index) => (
              <article key={project.name} className="bg-background p-6 md:p-8">
                <div className="flex items-center justify-between border-b border-ink/15 pb-5">
                  <span
                    className={`flex h-11 w-11 items-center justify-center ${project.accent} font-mono text-sm font-semibold text-white`}
                  >
                    0{index + 1}
                  </span>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    Portfolio Project
                  </p>
                </div>
                <h3 className="mt-8 text-3xl font-semibold text-ink">
                  {project.name}
                </h3>
                <div className="mt-8 space-y-7">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                      Problem
                    </p>
                    <p className="mt-3 text-base leading-7 text-ink">
                      {project.problem}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                      Data
                    </p>
                    <p className="mt-3 text-base leading-7 text-ink">
                      {project.data}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                      Insight
                    </p>
                    <p className="mt-3 text-base leading-7 text-ink">
                      {project.insight}
                    </p>
                  </div>
                </div>
                <Link
                  href={project.href}
                  className="mt-8 inline-block border border-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-ink transition hover:bg-ink hover:text-white"
                >
                  Open Project
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="skills" className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-10 lg:px-14">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-white/60">
              Skill Signal
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              Built to show judgment, not just tools.
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/70">
              Landing page ini menjadi pintu masuk. Modul berikutnya akan
              menghubungkan chart Recharts ke API gateway yang sudah disiapkan.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px bg-white/20 sm:grid-cols-2">
            {skills.map(([title, copy]) => (
              <article key={title} className="bg-ink p-6">
                <p className="text-2xl font-semibold">{title}</p>
                <p className="mt-5 text-base leading-7 text-white/68">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
