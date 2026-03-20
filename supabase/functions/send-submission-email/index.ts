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

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = "sb_publishable_JNGAGIHKRuDk1MvvcKjt0g_JdBMpVkI"
    #Deno.env.get("RESEND_API_KEY");
    const fromEmail = "visionempowertrust@gmail.com"
    #Deno.env.get("SUBMISSION_FROM_EMAIL");

    if (!resendApiKey || !fromEmail) {
      return new Response(JSON.stringify({ error: "Missing email service configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const payload = (await request.json()) as SubmissionEmailRequest;
    const recipients = Array.from(new Set([...parseEmails(payload.teacherEmails || ""), payload.ccEmail].filter(Boolean)));
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
      const errorText = await resendResponse.text();
      return new Response(JSON.stringify({ error: errorText || "Email send failed." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
