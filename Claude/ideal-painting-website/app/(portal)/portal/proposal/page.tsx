import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProposalConfigurator } from '@/components/proposal/proposal-configurator';
import type { ProposalBundle } from '@/lib/proposal-types';

export default async function ProposalPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!project) {
    return (
      <div className="text-center py-16 text-on-surface-variant">
        No active project found.
      </div>
    );
  }

  const { data: bundleRow } = await supabase
    .from('proposal_bundles')
    .select('id, bundle')
    .eq('project_id', project.id)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!bundleRow) {
    return (
      <div className="text-center py-16 text-on-surface-variant">
        Your proposal is being prepared. Check back soon.
      </div>
    );
  }

  const bundle = bundleRow.bundle as ProposalBundle;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <ProposalConfigurator bundle={bundle} bundleId={bundleRow.id} />
    </div>
  );
}
