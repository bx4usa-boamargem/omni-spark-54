import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  token: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, userId }: AcceptInviteRequest = await req.json();

    console.log("Accepting invite with token:", token, "for user:", userId);

    if (!token || !userId) {
      return new Response(
        JSON.stringify({ error: "Token e userId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from("team_invites")
      .select("*, blogs(name)")
      .eq("token", token)
      .maybeSingle();

    if (inviteError) {
      console.error("Error fetching invite:", inviteError);
      throw new Error("Erro ao buscar convite");
    }

    if (!invite) {
      console.log("Invite not found for token:", token);
      return new Response(
        JSON.stringify({ error: "not_found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      console.log("Invite expired:", invite.expires_at);
      return new Response(
        JSON.stringify({ error: "expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("blog_id", invite.blog_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMember) {
      console.log("User already a member:", userId);
      // Delete the invite since user is already a member
      await supabase.from("team_invites").delete().eq("id", invite.id);
      return new Response(
        JSON.stringify({ error: "already_member" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create team member
    const { error: memberError } = await supabase.from("team_members").insert({
      blog_id: invite.blog_id,
      user_id: userId,
      invited_by: invite.invited_by,
      role: invite.role,
      status: "active",
      accepted_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error("Error creating team member:", memberError);
      throw new Error("Erro ao adicionar membro");
    }

    // Log activity
    await supabase.from("team_activity_log").insert({
      blog_id: invite.blog_id,
      user_id: userId,
      action: "invite_accepted",
      resource_type: "team_member",
      details: { email: invite.email, role: invite.role },
    });

    // Delete the invite
    await supabase.from("team_invites").delete().eq("id", invite.id);

    console.log("Invite accepted successfully for user:", userId);

    const blogName = invite.blogs?.name || "Blog";

    return new Response(
      JSON.stringify({ 
        success: true, 
        blogName,
        role: invite.role 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in accept-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
