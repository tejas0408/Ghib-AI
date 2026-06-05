import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { GenerateForm } from '@/components/Generate/GenerateForm';
import { auth } from '@/lib/auth';

export default async function GeneratePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

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
