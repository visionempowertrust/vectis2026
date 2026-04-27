import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type SharedState = {
  submissions: Record<string, unknown>[];
  reviewers: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const TABLES = {
  submissions: "portal_submissions",
  reviewers: "portal_reviewers",
  assignments: "portal_assignments",
  reviews: "portal_reviews"
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function normalizeState(state: unknown): SharedState {
  const candidate = typeof state === "object" && state !== null ? state as Record<string, unknown> : {};
  return {
    submissions: Array.isArray(candidate.submissions) ? candidate.submissions as Record<string, unknown>[] : [],
    reviewers: Array.isArray(candidate.reviewers) ? candidate.reviewers as Record<string, unknown>[] : [],
    assignments: Array.isArray(candidate.assignments) ? candidate.assignments as Record<string, unknown>[] : [],
    reviews: Array.isArray(candidate.reviews) ? candidate.reviews as Record<string, unknown>[] : []
  };
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableText(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text : null;
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mergeById<T extends Record<string, unknown>>(base: T[], incoming: T[]): T[] {
  const byId = new Map<string, T>();
  [...base, ...incoming].forEach((item) => {
    const id = asText(item.id);
    if (!id) {
      return;
    }
    byId.set(id, { ...(byId.get(id) || {}), ...item });
  });
  return Array.from(byId.values());
}

function mapSubmissionToRow(submission: Record<string, unknown>) {
  return {
    id: asText(submission.id),
    created_at: asText(submission.createdAt, new Date().toISOString()),
    updated_at: asText(submission.updatedAt, asText(submission.createdAt, new Date().toISOString())),
    title: asText(submission.title),
    authors: asText(submission.authors),
    school_name: asText(submission.schoolName),
    school_address: asText(submission.schoolAddress),
    emails: asText(submission.emails),
    submission_category: asText(submission.submissionCategory),
    theme: asText(submission.theme),
    implementation_start: asNullableText(submission.implementationStart),
    weekly_periods: asNullableNumber(submission.weeklyPeriods),
    teacher_count: asNullableNumber(submission.teacherCount),
    student_count: asNullableNumber(submission.studentCount),
    grades: asText(submission.grades),
    attachment_name: asNullableText(submission.attachmentName),
    attachment_url: asNullableText(submission.attachmentUrl),
    attachment_path: asNullableText(submission.attachmentPath)
  };
}

function mapReviewerToRow(reviewer: Record<string, unknown>) {
  return {
    id: asText(reviewer.id),
    name: asText(reviewer.name),
    email: asText(reviewer.email),
    expertise: asText(reviewer.expertise),
    capacity: asNullableNumber(reviewer.capacity) || 1
  };
}

function mapAssignmentToRow(assignment: Record<string, unknown>) {
  return {
    id: asText(assignment.id),
    submission_id: asText(assignment.submissionId),
    reviewer_id: asText(assignment.reviewerId),
    assigned_at: asText(assignment.assignedAt, new Date().toISOString())
  };
}

function mapReviewToRow(review: Record<string, unknown>) {
  return {
    id: asText(review.id),
    submission_id: asText(review.submissionId),
    reviewer_id: asText(review.reviewerId),
    scores: typeof review.scores === "object" && review.scores !== null ? review.scores : {},
    total_score: asNullableNumber(review.totalScore) || 0,
    recommendation: asText(review.recommendation),
    comments: asText(review.comments),
    updated_at: asText(review.updatedAt, new Date().toISOString())
  };
}

async function downloadJson(client: ReturnType<typeof createClient>, bucket: string, path: string) {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(error?.message || `Unable to download ${path}`);
  }
  return JSON.parse(await data.text());
}

async function listSubmissionMetadata(client: ReturnType<typeof createClient>, bucket: string) {
  const { data, error } = await client.storage.from(bucket).list("submissions", { limit: 1000 });
  if (error || !data) {
    return [];
  }

  const records = await Promise.all(
    data.map(async (item) => {
      try {
        return await downloadJson(client, bucket, `submissions/${item.name}`) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
  );

  return records.filter((item): item is Record<string, unknown> => Boolean(item));
}

async function upsertRows(
  client: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string
) {
  if (!rows.length) {
    return;
  }

  const { error } = await client.from(table).upsert(rows, { onConflict });
  if (error) {
    throw new Error(error.message);
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for import."
      }, 500);
    }

    const body = request.method === "POST" ? await request.json().catch(() => ({})) as Record<string, unknown> : {};
    const bucket = asText(body.bucket, "vectis2026");
    const statePath = asText(body.statePath, "state/state.json");

    const client = createClient(supabaseUrl, serviceRoleKey);
    const rawState = await downloadJson(client, bucket, statePath);
    const state = normalizeState(rawState);
    const submissionFiles = await listSubmissionMetadata(client, bucket);
    state.submissions = mergeById(state.submissions, submissionFiles);

    await upsertRows(client, TABLES.submissions, state.submissions.map(mapSubmissionToRow), "id");
    await upsertRows(client, TABLES.reviewers, state.reviewers.map(mapReviewerToRow), "id");
    await upsertRows(client, TABLES.assignments, state.assignments.map(mapAssignmentToRow), "submission_id,reviewer_id");
    await upsertRows(client, TABLES.reviews, state.reviews.map(mapReviewToRow), "submission_id,reviewer_id");

    return jsonResponse({
      ok: true,
      imported: {
        submissions: state.submissions.length,
        reviewers: state.reviewers.length,
        assignments: state.assignments.length,
        reviews: state.reviews.length
      },
      source: {
        bucket,
        statePath,
        submissionFilesMerged: submissionFiles.length
      }
    });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unknown import error"
    }, 500);
  }
});
