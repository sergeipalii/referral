import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

/**
 * Public read-only rendering of `docs/system-overview.md`. Not linked from
 * the owner sidebar — accessed directly by URL, no auth gate.
 *
 * The markdown is read at BUILD TIME (server component, module-level side
 * effect) and the resulting HTML is baked into the Next.js static output.
 * The canonical copy lives at `docs/system-overview.md` in the repo root;
 * the Dockerfile copies it into the build context for production builds.
 */

// Resolve the canonical doc. `next build` runs with cwd = apps/frontend, so
// `../../docs/system-overview.md` points at monorepo-root/docs.
const DOC_PATH = path.join(
  process.cwd(),
  '..',
  '..',
  'docs',
  'system-overview.md',
);

function loadDoc(): string {
  try {
    return fs.readFileSync(DOC_PATH, 'utf8');
  } catch (err) {
    // Degrade gracefully if the doc is missing for some reason (eg. running
    // an old container that predates the Dockerfile change). Better to show
    // a placeholder than to 500 the whole route.
    return `# System Overview\n\nDocument not available in this build.\n\n(${
      err instanceof Error ? err.message : String(err)
    })`;
  }
}

const MD = loadDoc();
const HTML = marked.parse(MD, { async: false }) as string;

// Tailwind v4 doesn't ship @tailwindcss/typography by default. Instead of
// pulling in the plugin we hand-write a small set of arbitrary variants on
// the container — keeps the page self-contained and avoids a config change
// that would affect the rest of the app.
const PROSE = [
  '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:text-gray-900',
  '[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:pt-6 [&_h2]:border-t [&_h2]:border-gray-200 [&_h2]:text-gray-900',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-gray-900',
  '[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-gray-900',
  '[&_p]:my-3 [&_p]:leading-relaxed [&_p]:text-gray-800',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol]:space-y-1',
  '[&_li]:text-gray-800 [&_li]:leading-relaxed',
  '[&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-pink-700 [&_code]:font-mono',
  '[&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-xs',
  '[&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0',
  '[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_table]:block [&_table]:overflow-x-auto',
  '[&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-100 [&_th]:border [&_th]:border-gray-200 [&_th]:font-semibold',
  '[&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-gray-200 [&_td]:align-top',
  '[&_hr]:my-8 [&_hr]:border-gray-200',
  '[&_strong]:font-semibold [&_strong]:text-gray-900',
  '[&_a]:text-indigo-600 [&_a]:underline hover:[&_a]:text-indigo-800',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-700',
].join(' ');

export default function SystemOverviewPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            Referral System — public documentation
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <article
          className={PROSE}
          // Content is rendered from a Markdown file that lives inside this
          // repository — no user input flows in, so dangerouslySetInnerHTML
          // is safe here.
          dangerouslySetInnerHTML={{ __html: HTML }}
        />
      </main>
    </div>
  );
}
