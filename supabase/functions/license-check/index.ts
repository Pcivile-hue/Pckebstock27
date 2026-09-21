import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ACTIVATION_SUFFIX = "07041982";
const TRIAL_DAYS = 30;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ status: "error", message: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with the user's token to identify them
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ status: "error", message: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Use service role for writes (RLS with user token would also work, but service role is simpler)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action || "check";

    if (action === "check") {
      // First, try to find a record for this specific user
      let { data: existing } = await adminClient
        .from("license_activations")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // If not found, check for orphaned records (user_id = null) and claim the most recent one
      if (!existing) {
        const { data: orphan } = await adminClient
          .from("license_activations")
          .select("*")
          .is("user_id", null)
          .order("trial_started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orphan) {
          await adminClient
            .from("license_activations")
            .update({ user_id: userId })
            .eq("id", orphan.id);
          existing = { ...orphan, user_id: userId };
        }
      }

      if (existing) {
        if (existing.is_activated) {
          return new Response(
            JSON.stringify({ status: "activated", trial_days_left: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const now = new Date();
        const expires = new Date(existing.trial_expires_at);
        const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft > 0) {
          return new Response(
            JSON.stringify({ status: "trial", trial_days_left: daysLeft }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ status: "expired", trial_days_left: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // New account — create trial record
      const trialStart = new Date();
      const trialExpires = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

      const { error: insertError } = await adminClient.from("license_activations").insert({
        user_id: userId,
        trial_started_at: trialStart.toISOString(),
        trial_expires_at: trialExpires.toISOString(),
        is_activated: false,
      });

      if (insertError) {
        // Insert failed (maybe unique constraint) — try to fetch existing again
        const { data: retry } = await adminClient
          .from("license_activations")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (retry) {
          existing = retry;
          if (existing.is_activated) {
            return new Response(
              JSON.stringify({ status: "activated", trial_days_left: 0 }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const now = new Date();
          const expires = new Date(existing.trial_expires_at);
          const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0) {
            return new Response(
              JSON.stringify({ status: "trial", trial_days_left: daysLeft }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            return new Response(
              JSON.stringify({ status: "expired", trial_days_left: 0 }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({ status: "trial", trial_days_left: TRIAL_DAYS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "activate") {
      const code = (body.code || "").trim();

      const fullCodePattern = new RegExp(`^\\d{5}${ACTIVATION_SUFFIX}$`);
      if (!fullCodePattern.test(code)) {
        return new Response(
          JSON.stringify({ status: "error", message: "رمز التفعيل غير صحيح" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await adminClient
        .from("license_activations")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing && existing.is_activated) {
        return new Response(
          JSON.stringify({ status: "activated", message: "الجهاز مفعّل بالفعل" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();

      if (existing) {
        await adminClient
          .from("license_activations")
          .update({
            is_activated: true,
            activation_code: code,
            activated_at: now,
          })
          .eq("user_id", userId);
      } else {
        const trialStart = new Date();
        const trialExpires = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
        await adminClient.from("license_activations").insert({
          user_id: userId,
          trial_started_at: trialStart.toISOString(),
          trial_expires_at: trialExpires.toISOString(),
          is_activated: true,
          activation_code: code,
          activated_at: now,
        });
      }

      return new Response(
        JSON.stringify({ status: "activated", message: "تم تفعيل الموقع بنجاح" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ status: "error", message: "إجراء غير معروف" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: "حدث خطأ في الخادم" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
