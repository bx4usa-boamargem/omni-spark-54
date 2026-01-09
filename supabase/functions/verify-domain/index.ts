import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { blogId } = await req.json();

    if (!blogId) {
      return new Response(
        JSON.stringify({ error: "blogId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Verifying domain for blog: ${blogId}`);

    // Fetch blog data
    const { data: blog, error: blogError } = await supabase
      .from("blogs")
      .select("custom_domain, domain_verification_token")
      .eq("id", blogId)
      .single();

    if (blogError || !blog) {
      console.error("Blog not found:", blogError);
      return new Response(
        JSON.stringify({ error: "Blog not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!blog.custom_domain) {
      return new Response(
        JSON.stringify({ verified: false, message: "No custom domain configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking DNS for domain: ${blog.custom_domain}`);

    // Check TXT record for verification
    // Using DNS over HTTPS (DoH) with Cloudflare
    const txtRecordName = `_omniseen-verify.${blog.custom_domain}`;
    const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${txtRecordName}&type=TXT`;

    const dnsResponse = await fetch(dnsUrl, {
      headers: { Accept: "application/dns-json" },
    });

    if (!dnsResponse.ok) {
      console.error("DNS query failed:", dnsResponse.status);
      return new Response(
        JSON.stringify({
          verified: false,
          message: "Não foi possível consultar o DNS. Tente novamente mais tarde.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dnsData = await dnsResponse.json();
    console.log("DNS Response:", JSON.stringify(dnsData));

    // Check if TXT record matches
    let verified = false;
    if (dnsData.Answer) {
      for (const answer of dnsData.Answer) {
        // TXT records come with quotes, remove them
        const txtValue = answer.data?.replace(/"/g, "");
        console.log(`Found TXT record: ${txtValue}`);
        if (txtValue === blog.domain_verification_token) {
          verified = true;
          break;
        }
      }
    }

    if (verified) {
      // Update blog as verified
      const { error: updateError } = await supabase
        .from("blogs")
        .update({ domain_verified: true })
        .eq("id", blogId);

      if (updateError) {
        console.error("Error updating blog:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update verification status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Domain ${blog.custom_domain} verified successfully`);

      return new Response(
        JSON.stringify({
          verified: true,
          message: "Domínio verificado com sucesso!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Domain ${blog.custom_domain} verification failed - TXT record not found`);

    return new Response(
      JSON.stringify({
        verified: false,
        message: "Registro TXT de verificação não encontrado. Verifique se o DNS foi configurado corretamente e aguarde a propagação (pode levar até 48h).",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-domain:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
