import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DnsCheckResult {
  status: "ok" | "missing" | "mismatch" | "error";
  found: string[];
  expected?: string;
  message?: string;
}

interface DnsReport {
  domain: string;
  checks: {
    txt: DnsCheckResult;
    cname: DnsCheckResult;
    a: DnsCheckResult;
  };
  overallStatus: "ready" | "pending" | "error";
  recommendations: string[];
}

async function queryDns(name: string, type: string): Promise<{ Answer?: Array<{ data: string }>, Status?: number }> {
  try {
    const dnsUrl = `https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`;
    const response = await fetch(dnsUrl, {
      headers: { Accept: "application/dns-json" },
    });
    
    if (!response.ok) {
      console.error(`DNS query failed for ${name} (${type}):`, response.status);
      return { Status: response.status };
    }
    
    return await response.json();
  } catch (error) {
    console.error(`DNS query error for ${name} (${type}):`, error);
    return { Status: -1 };
  }
}

serve(async (req) => {
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

    console.log(`Checking DNS for blog: ${blogId}`);

    // Fetch blog data
    const { data: blog, error: blogError } = await supabase
      .from("blogs")
      .select("custom_domain, domain_verification_token, integration_type")
      .eq("id", blogId)
      .single();

    if (blogError || !blog) {
      return new Response(
        JSON.stringify({ error: "Blog not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!blog.custom_domain) {
      return new Response(
        JSON.stringify({ error: "No custom domain configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = blog.custom_domain;
    const token = blog.domain_verification_token;
    const recommendations: string[] = [];

    // Check TXT record
    const txtName = `_omniseen-verify.${domain}`;
    const txtResult = await queryDns(txtName, "TXT");
    
    let txtCheck: DnsCheckResult = {
      status: "missing",
      found: [],
      expected: token,
    };

    if (txtResult.Answer && txtResult.Answer.length > 0) {
      const foundValues = txtResult.Answer.map(a => a.data?.replace(/"/g, "") || "");
      txtCheck.found = foundValues;
      
      if (foundValues.includes(token)) {
        txtCheck.status = "ok";
        txtCheck.message = "Registro TXT encontrado e verificado!";
      } else {
        txtCheck.status = "mismatch";
        txtCheck.message = "Registro TXT encontrado, mas o valor não corresponde ao token esperado.";
        recommendations.push(`O valor do TXT está incorreto. Valor esperado: ${token}`);
      }
    } else {
      txtCheck.message = "Registro TXT não encontrado.";
      recommendations.push(
        `Adicione um registro TXT com Nome: _omniseen-verify e Valor: ${token}`
      );
    }

    // Check CNAME record (for subdomain integration)
    let cnameCheck: DnsCheckResult = {
      status: "missing",
      found: [],
      expected: "cname.lovableproject.com",
    };

    const cnameResult = await queryDns(domain, "CNAME");
    
    if (cnameResult.Answer && cnameResult.Answer.length > 0) {
      const foundValues = cnameResult.Answer.map(a => a.data?.replace(/\.$/, "") || "");
      cnameCheck.found = foundValues;
      
      if (foundValues.some(v => v.includes("lovable"))) {
        cnameCheck.status = "ok";
        cnameCheck.message = "CNAME configurado corretamente!";
      } else {
        cnameCheck.status = "mismatch";
        cnameCheck.message = "CNAME encontrado, mas aponta para destino incorreto.";
        recommendations.push(`O CNAME deve apontar para cname.lovableproject.com`);
      }
    } else {
      cnameCheck.message = "Registro CNAME não encontrado.";
    }

    // Check A record
    let aCheck: DnsCheckResult = {
      status: "missing",
      found: [],
      expected: "185.158.133.1",
    };

    const aResult = await queryDns(domain, "A");
    
    if (aResult.Answer && aResult.Answer.length > 0) {
      const foundValues = aResult.Answer.map(a => a.data || "");
      aCheck.found = foundValues;
      
      if (foundValues.includes("185.158.133.1")) {
        aCheck.status = "ok";
        aCheck.message = "Registro A configurado corretamente!";
      } else {
        aCheck.status = "mismatch";
        aCheck.message = "Registro A encontrado, mas IP incorreto.";
        recommendations.push(`O registro A deve apontar para 185.158.133.1`);
      }
    } else {
      aCheck.message = "Registro A não encontrado.";
    }

    // If no CNAME, then A record is required
    if (cnameCheck.status !== "ok" && aCheck.status !== "ok") {
      recommendations.push(
        "Configure um CNAME apontando para cname.lovableproject.com OU um registro A apontando para 185.158.133.1"
      );
    }

    // Determine overall status
    let overallStatus: "ready" | "pending" | "error" = "pending";
    
    if (txtCheck.status === "ok" && (cnameCheck.status === "ok" || aCheck.status === "ok")) {
      overallStatus = "ready";
    } else if (txtCheck.status === "error" || cnameCheck.status === "error" || aCheck.status === "error") {
      overallStatus = "error";
    }

    const report: DnsReport = {
      domain,
      checks: {
        txt: txtCheck,
        cname: cnameCheck,
        a: aCheck,
      },
      overallStatus,
      recommendations,
    };

    console.log(`DNS check complete for ${domain}:`, JSON.stringify(report));

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-domain-dns:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
