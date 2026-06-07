import { GenerateForm } from '@/components/Generate/GenerateForm';
import { requireAuth } from '@/lib/auth-server';

export default async function GeneratePage() {
  await requireAuth('/generate');

  return (
    <div className="section-shell py-12 text-ink">
      <div className="mb-8 border-b border-white/10 pb-8">
        <p className="mb-3 text-sm text-rose">Generate</p>
        <h1 className="font-serif text-4xl text-ink md:text-5xl">Creative Workstation</h1>
      </div>

      <GenerateForm />
    </div>
  );
}
