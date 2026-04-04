"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  title: string;
  address: string;
  client_id: string;
  profiles: { full_name: string }[] | { full_name: string } | null;
};

type BundleRow = {
  id: string;
  project_id: string;
  client_name: string | null;
  status: string;
  created_at: string;
  bundle: { project?: { name?: string }; originalScope?: { bidPrice?: number; items?: unknown[] } };
};

type SubmissionRow = {
  id: string;
  bundle_id: string;
  original_total: number;
  adjusted_total: number;
  changes: unknown[];
  status: string;
  submitted_at: string;
  notes: string | null;
};

export default function AdminProposalsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadBundles(selectedProjectId);
      loadSubmissions(selectedProjectId);
    } else {
      setBundles([]);
      setSubmissions([]);
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, title, address, client_id, profiles(full_name)")
      .order("created_at", { ascending: false });
    if (data) setProjects(data as Project[]);
  }

  async function loadBundles(projectId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("proposal_bundles")
      .select("id, project_id, client_name, status, created_at, bundle")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) setBundles(data as BundleRow[]);
  }

  async function loadSubmissions(projectId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("proposal_submissions")
      .select("*")
      .in(
        "bundle_id",
        bundles.map((b) => b.id)
      )
      .order("submitted_at", { ascending: false });
    if (data) setSubmissions(data as SubmissionRow[]);
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !selectedProjectId) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const text = await file.text();
      const bundle = JSON.parse(text);

      // Validate bundle structure
      if (!bundle.meta?.exportVersion || !bundle.originalScope?.items) {
        setUploadResult("Invalid bundle — missing meta.exportVersion or originalScope.items");
        return;
      }

      const supabase = createClient();

      // Supersede any existing active bundles for this project
      await supabase
        .from("proposal_bundles")
        .update({ status: "superseded" })
        .eq("project_id", selectedProjectId)
        .in("status", ["draft", "sent"]);

      // Insert the new bundle
      const { error } = await supabase.from("proposal_bundles").insert({
        project_id: selectedProjectId,
        client_name: bundle.project?.clientName || null,
        project_address: bundle.project?.address || null,
        bundle,
        status: "sent",
      });

      if (error) {
        setUploadResult(`Upload failed: ${error.message}`);
      } else {
        setUploadResult("Proposal uploaded and live. Client can now view it in the portal.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadBundles(selectedProjectId);
      }
    } catch (e) {
      setUploadResult(`Parse error: ${e instanceof Error ? e.message : "Invalid JSON"}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleStatusChange(bundleId: string, newStatus: string) {
    const supabase = createClient();
    await supabase
      .from("proposal_bundles")
      .update({ status: newStatus, sent_at: newStatus === "sent" ? new Date().toISOString() : undefined })
      .eq("id", bundleId);
    loadBundles(selectedProjectId);
  }

  async function handleSubmissionAction(submissionId: string, action: "accepted" | "revised") {
    const supabase = createClient();
    await supabase
      .from("proposal_submissions")
      .update({ status: action })
      .eq("id", submissionId);
    loadSubmissions(selectedProjectId);
  }

  function formatCurrency(amount: number): string {
    return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2 });
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-6">
        Proposals
      </h1>

      {/* Project selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          Select Project
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
        >
          <option value="">— Choose a project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} — {(Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name) || "No client"} ({p.address})
            </option>
          ))}
        </select>
      </div>

      {selectedProjectId && (
        <>
          {/* Upload section */}
          <div className="mb-8 p-6 rounded-lg border border-outline-variant bg-surface-container-low">
            <h2 className="font-headline text-lg font-semibold mb-4">
              Upload Proposal Bundle
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">
              Export a proposal JSON from PaintScope and upload it here. This will
              supersede any existing active bundle and make the new one immediately
              available to the client.
            </p>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="text-sm"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 rounded bg-primary text-on-primary font-medium hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload & Activate"}
              </button>
            </div>
            {uploadResult && (
              <p
                className={`mt-3 text-sm ${
                  uploadResult.includes("failed") || uploadResult.includes("error") || uploadResult.includes("Invalid")
                    ? "text-red-600"
                    : "text-green-700"
                }`}
              >
                {uploadResult}
              </p>
            )}
          </div>

          {/* Existing bundles */}
          <div className="mb-8">
            <h2 className="font-headline text-lg font-semibold mb-4">
              Proposal History
            </h2>
            {bundles.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No proposals uploaded for this project yet.
              </p>
            ) : (
              <div className="space-y-3">
                {bundles.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-outline-variant"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {b.bundle?.project?.name || "Untitled"} —{" "}
                        {b.bundle?.originalScope?.items?.length || 0} line items
                      </div>
                      <div className="text-xs text-on-surface-variant">
                        {formatDate(b.created_at)} · Bid:{" "}
                        {b.bundle?.originalScope?.bidPrice
                          ? formatCurrency(b.bundle.originalScope.bidPrice)
                          : "N/A"}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        b.status === "sent"
                          ? "bg-green-100 text-green-800"
                          : b.status === "superseded"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {b.status}
                    </span>
                    {b.status === "draft" && (
                      <button
                        onClick={() => handleStatusChange(b.id, "sent")}
                        className="text-xs text-primary hover:underline"
                      >
                        Send to Client
                      </button>
                    )}
                    {b.status === "sent" && (
                      <button
                        onClick={() => handleStatusChange(b.id, "superseded")}
                        className="text-xs text-on-surface-variant hover:underline"
                      >
                        Supersede
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client submissions */}
          <div>
            <h2 className="font-headline text-lg font-semibold mb-4">
              Client Submissions
            </h2>
            {submissions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No client submissions yet.
              </p>
            ) : (
              <div className="space-y-3">
                {submissions.map((s) => {
                  const changeCount = Array.isArray(s.changes)
                    ? s.changes.length
                    : 0;
                  const delta = s.adjusted_total - s.original_total;

                  return (
                    <div
                      key={s.id}
                      className="p-4 rounded-lg border border-outline-variant"
                    >
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {formatDate(s.submitted_at)} —{" "}
                            {changeCount === 0
                              ? "No changes from original"
                              : `${changeCount} change${changeCount !== 1 ? "s" : ""}`}
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            Original: {formatCurrency(s.original_total)} → Final:{" "}
                            {formatCurrency(s.adjusted_total)}
                            {delta !== 0 && (
                              <span
                                className={
                                  delta > 0 ? " text-red-600" : " text-green-600"
                                }
                              >
                                {" "}
                                ({delta > 0 ? "+" : ""}
                                {formatCurrency(delta)})
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            s.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : s.status === "revised"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {s.status.replace("_", " ")}
                        </span>
                      </div>

                      {s.notes && (
                        <p className="text-xs text-on-surface-variant italic mb-2">
                          Client note: {s.notes}
                        </p>
                      )}

                      {/* Show individual changes */}
                      {changeCount > 0 && (
                        <div className="mt-2 text-xs space-y-1">
                          {(s.changes as Array<{ lineId: string; type: string; from?: string; to?: string; priceDelta: number }>).map(
                            (change, i) => (
                              <div key={i} className="flex gap-2">
                                <span
                                  className={`font-bold ${
                                    change.type === "removed"
                                      ? "text-red-600"
                                      : change.type === "added"
                                      ? "text-green-600"
                                      : "text-blue-600"
                                  }`}
                                >
                                  {change.type === "removed"
                                    ? "✕"
                                    : change.type === "added"
                                    ? "+"
                                    : "▲"}
                                </span>
                                <span className="text-on-surface-variant">
                                  {change.lineId.replace(/^line_\d+_/, "").replace(/_/g, " ")}
                                  {change.type === "qt_change" &&
                                    ` (${change.from} → ${change.to})`}
                                </span>
                                <span
                                  className={`ml-auto font-mono ${
                                    change.priceDelta > 0
                                      ? "text-red-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {change.priceDelta > 0 ? "+" : ""}
                                  {formatCurrency(change.priceDelta)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {s.status === "pending_review" && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleSubmissionAction(s.id, "accepted")}
                            className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleSubmissionAction(s.id, "revised")}
                            className="text-xs px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                          >
                            Request Revision
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
