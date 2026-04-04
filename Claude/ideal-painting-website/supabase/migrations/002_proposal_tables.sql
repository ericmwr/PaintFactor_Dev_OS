-- 002_proposal_tables.sql
-- Proposal bundles exported from PaintFactor and client submissions

CREATE TABLE proposal_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_name text,
  project_address text,
  bundle jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'superseded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE proposal_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES proposal_bundles(id) ON DELETE CASCADE,
  original_total numeric NOT NULL,
  adjusted_total numeric NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'accepted', 'revised')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Indexes
CREATE INDEX idx_proposal_bundles_project ON proposal_bundles(project_id);
CREATE INDEX idx_proposal_bundles_status ON proposal_bundles(status);
CREATE INDEX idx_proposal_submissions_bundle ON proposal_submissions(bundle_id);
CREATE INDEX idx_proposal_submissions_status ON proposal_submissions(status);

-- RLS policies
ALTER TABLE proposal_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_submissions ENABLE ROW LEVEL SECURITY;

-- Clients can view bundles for their own projects
CREATE POLICY "Clients view own proposal bundles"
  ON proposal_bundles FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id = auth.uid()
    )
  );

-- Admins have full access to bundles
CREATE POLICY "Admins manage proposal bundles"
  ON proposal_bundles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Clients can view and insert submissions for their bundles
CREATE POLICY "Clients view own submissions"
  ON proposal_submissions FOR SELECT
  USING (
    bundle_id IN (
      SELECT pb.id FROM proposal_bundles pb
      JOIN projects p ON pb.project_id = p.id
      WHERE p.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients create submissions"
  ON proposal_submissions FOR INSERT
  WITH CHECK (
    bundle_id IN (
      SELECT pb.id FROM proposal_bundles pb
      JOIN projects p ON pb.project_id = p.id
      WHERE p.client_id = auth.uid()
    )
  );

-- Admins have full access to submissions
CREATE POLICY "Admins manage submissions"
  ON proposal_submissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
