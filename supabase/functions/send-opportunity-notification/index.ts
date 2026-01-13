import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  opportunityId: string;
  blogId: string;
  title: string;
  score: number;
  keywords: string[];
  commercialAlignment?: string;
}

function formatWhatsAppMessage(title: string, score: number, keywords: string[]): string {
  const keywordsList = keywords.slice(0, 3).join(', ');
  return encodeURIComponent(
    `🎯 *Nova Oportunidade de Conteúdo*\n\n` +
    `📝 ${title}\n` +
    `📊 Relevância: ${score}%\n` +
    `🔑 Keywords: ${keywordsList}\n\n` +
    `Acesse o painel para mais detalhes.`
  );
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  return phone.replace(/\D/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { opportunityId, blogId, title, score, keywords }: NotificationRequest = await req.json();
    console.log('Sending notification for opportunity:', { opportunityId, blogId, title, score });

    if (!blogId || !opportunityId) {
      return new Response(
        JSON.stringify({ error: 'blogId and opportunityId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch notification settings for all users of this blog
    const { data: settings } = await supabase
      .from('opportunity_notifications')
      .select('*')
      .eq('blog_id', blogId);

    if (!settings || settings.length === 0) {
      console.log('No notification settings found for blog:', blogId);
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notifiedCount = 0;
    const notificationMessage = `Nova oportunidade de artigo com ${score}% de relevância: "${title}"`;

    for (const setting of settings) {
      // Check if user only wants high score notifications
      const threshold = setting.high_score_threshold || setting.min_relevance_score || 70;
      if (setting.notify_high_score_only && score < threshold) {
        console.log(`Score ${score} below high-score threshold ${threshold} for user ${setting.user_id}`);
        continue;
      }

      // Check standard threshold
      if (score < setting.min_relevance_score) {
        console.log(`Score ${score} below threshold ${setting.min_relevance_score} for user ${setting.user_id}`);
        continue;
      }

      // Check if user prefers digest (non-immediate notifications)
      if (setting.notification_frequency && setting.notification_frequency !== 'immediate') {
        console.log(`User ${setting.user_id} prefers ${setting.notification_frequency} digest, skipping immediate notification`);
        // The digest function will handle these users
        continue;
      }

      // Create in-app notification
      if (setting.notify_in_app) {
        const { error: inAppError } = await supabase
          .from('opportunity_notification_history')
          .insert({
            opportunity_id: opportunityId,
            blog_id: blogId,
            user_id: setting.user_id,
            notification_type: 'in_app',
            title: `🎯 Oportunidade ${score}%`,
            message: notificationMessage,
          });

        if (inAppError) {
          console.error('Error creating in-app notification:', inAppError);
        } else {
          notifiedCount++;
        }
      }

      // Send email notification if enabled - using centralized send-email function
      if (setting.notify_email && setting.email_address) {
        try {
          // Get user's preferred language
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('user_id', setting.user_id)
            .maybeSingle();

          const language = profile?.preferred_language || 'pt-BR';

          // Call centralized send-email function
          const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: setting.email_address,
              template: 'opportunity_alert',
              language,
              variables: {
                score: String(score),
                title,
                keywords: keywords.join(', '),
                opportunityUrl: `${SUPABASE_URL?.replace('.supabase.co', '.lovable.app')}/client/consultant`,
              },
              blogId,
              userId: setting.user_id,
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error('Error sending email via send-email function:', errorText);
          } else {
            // Log email notification
            await supabase
              .from('opportunity_notification_history')
              .insert({
                opportunity_id: opportunityId,
                blog_id: blogId,
                user_id: setting.user_id,
                notification_type: 'email',
                title: `🎯 Oportunidade ${score}%`,
                message: notificationMessage,
              });
            notifiedCount++;
          }
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }

      // Send WhatsApp notification if enabled
      if (setting.notify_whatsapp && setting.whatsapp_number) {
        try {
          const formattedPhone = formatPhoneNumber(setting.whatsapp_number);
          const whatsappMessage = formatWhatsAppMessage(title, score, keywords);
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${whatsappMessage}`;

          // Log WhatsApp notification with the URL (user clicks to send)
          await supabase
            .from('opportunity_notification_history')
            .insert({
              opportunity_id: opportunityId,
              blog_id: blogId,
              user_id: setting.user_id,
              notification_type: 'whatsapp',
              title: `🎯 Oportunidade ${score}%`,
              message: whatsappUrl,
            });

          console.log(`WhatsApp notification prepared for ${formattedPhone}`);
          notifiedCount++;
        } catch (whatsappError) {
          console.error('Error preparing WhatsApp notification:', whatsappError);
        }
      }
    }

    console.log(`Notified ${notifiedCount} users`);

    return new Response(
      JSON.stringify({ success: true, notified: notifiedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-opportunity-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
