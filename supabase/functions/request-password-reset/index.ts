import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[request-password-reset] Request received');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email || typeof email !== 'string') {
      console.log('[request-password-reset] Invalid email provided');
      // Return success anyway to not reveal if email exists
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[request-password-reset] Processing for email:', email.substring(0, 3) + '***');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const publicAppUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://app.omniseen.app';

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Generate recovery link using Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${publicAppUrl}/reset-password`
      }
    });

    if (linkError) {
      console.log('[request-password-reset] Link generation failed (user may not exist):', linkError.message);
      // Return success anyway to not reveal if email exists
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!linkData?.properties?.action_link) {
      console.log('[request-password-reset] No action link generated');
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetUrl = linkData.properties.action_link;
    console.log('[request-password-reset] Reset link generated successfully');

    // Send email via Brevo using send-email function
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const brevoSenderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@omniseen.app';
    const brevoSenderName = Deno.env.get('BREVO_SENDER_NAME') || 'Omniseen';

    if (!brevoApiKey) {
      console.error('[request-password-reset] BREVO_API_KEY not configured');
      // Still return success but log the issue
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email directly via Brevo API
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: brevoSenderName,
          email: brevoSenderEmail,
        },
        to: [{ email: email }],
        subject: 'Recupere sua senha - Omniseen',
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6366f1; margin: 0;">Omniseen</h1>
            </div>
            
            <h2 style="color: #1f2937; margin-bottom: 20px;">Recuperação de Senha</h2>
            
            <p>Você solicitou a recuperação de senha da sua conta Omniseen.</p>
            
            <p>Clique no botão abaixo para definir uma nova senha:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Redefinir Senha
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              Se você não solicitou esta recuperação, ignore este email.
            </p>
            
            <p style="color: #6b7280; font-size: 14px;">
              Este link expira em 1 hora.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              Se o botão não funcionar, copie e cole este link no seu navegador:<br>
              <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
            </p>
          </body>
          </html>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('[request-password-reset] Brevo API error:', brevoResponse.status, errorText);
    } else {
      const brevoData = await brevoResponse.json();
      console.log('[request-password-reset] Email sent via Brevo, messageId:', brevoData.messageId);

      // Log to email_logs table
      try {
        await supabaseAdmin
          .from('email_logs')
          .insert({
            to_email: email,
            template_type: 'password_reset',
            status: 'sent',
            brevo_message_id: brevoData.messageId,
            metadata: { resetUrl: resetUrl.substring(0, 50) + '...' }
          });
        console.log('[request-password-reset] Logged to email_logs');
      } catch (logError) {
        console.error('[request-password-reset] Failed to log email:', logError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[request-password-reset] Unexpected error:', error);
    // Always return success to not reveal information
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
