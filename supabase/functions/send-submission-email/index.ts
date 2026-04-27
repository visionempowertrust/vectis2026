import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type SubmissionEmailRequest = {
  submissionId: string;
  title: string;
  teacherEmails: string;
  ccEmail: string;
  isUpdate?: boolean;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function parseEmails(value: string): string[] {
  return value
    .split(/[,\n;]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL")?.trim();

    if (!resendApiKey || !fromEmail) {
      return jsonResponse({
        error: "Missing email service configuration. Set RESEND_API_KEY and RESEND_FROM_EMAIL in Supabase secrets."
      }, 500);
    }

    const payload = (await request.json()) as SubmissionEmailRequest;
    const recipients = Array.from(new Set([...parseEmails(payload.teacherEmails || ""), payload.ccEmail].filter(Boolean)));
    if (!payload.submissionId || !payload.title) {
      return jsonResponse({ error: "Submission ID and title are required for email delivery." }, 400);
    }
    if (!recipients.length) {
      return jsonResponse({ error: "No recipient email addresses were provided." }, 400);
    }

    const subject = `VE CTIS Submission - ${payload.submissionId} - ${payload.title}`;
    const actionText = payload.isUpdate ? "updated" : "received";

    const html = `
      <p>Dear participant,</p>
      <p>Your VE CTIS submission has been ${actionText} successfully.</p>
      <p><strong>Submission ID:</strong> ${payload.submissionId}</p>
      <p><strong>Title:</strong> ${payload.title}</p>
      <p>Please keep this submission ID for future reference.</p>
      <p>Regards,<br>Vision Empower Trust</p>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        html
      })
    });

    if (!resendResponse.ok) {
      let errorMessage = "Email send failed.";
      try {
        const errorBody = await resendResponse.json();
        errorMessage = errorBody?.message || errorBody?.error?.message || errorBody?.error || errorMessage;
      } catch {
        errorMessage = await resendResponse.text() || errorMessage;
      }
      return jsonResponse({ error: errorMessage }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
