// supabase/functions/scheduler-tick/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Schedule {
  id: string
  tenant_id: string
  enabled: boolean
  mix_policy: { blog: number; super_page: number }
  timezone: string
  days_of_week: number[]
  start_time: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration missing in environment.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 1. Buscando todos os schedules ativos
    const { data: schedules, error: scheduleError } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('enabled', true)

    if (scheduleError) throw scheduleError

    const activeSchedules = schedules as Schedule[]
    let jobsCreated = 0

    // Base Date instance
    const nowUTC = new Date()

    for (const schedule of activeSchedules) {
      // 2. Validar timezone e days_of_week
      const tz = schedule.timezone || 'America/Sao_Paulo'

      // Converte data atual para a data no fuso do schedule para pegar o dia da semana correto
      const localString = nowUTC.toLocaleString('en-US', { timeZone: tz })
      const localDate = new Date(localString)
      const currentLocalDay = localDate.getDay() // 0 = Sunday, 1 = Monday...

      const allowedDays = schedule.days_of_week || [1, 2, 3, 4, 5] // Padrão Seg-Sex se nulo
      // Verifica dia
      if (!allowedDays.includes(currentLocalDay)) continue

      // Checar se já existe job recém gerado (últimas 24hs)
      const { count, error: countError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', schedule.tenant_id)
        .in('job_type', ['generate_blog', 'generate_super_page'])
        .gte('created_at', new Date(nowUTC.getTime() - 24 * 60 * 60 * 1000).toISOString())

      if (countError) throw countError

      if (count && count > 0) {
        // Job já executou hoje
        continue
      }

      // 3. Escolher entre blog ou super_page com base no mix_policy
      const blogRatio = schedule.mix_policy?.blog ?? 0.7
      const isBlog = Math.random() <= blogRatio
      const jobType = isBlog ? 'generate_blog' : 'generate_super_page'

      const payload = {
        source: 'scheduler-tick',
        schedule_id: schedule.id,
        mix_policy: schedule.mix_policy,
        priority: 'normal'
      }

      // Em um cenário real, também leríamos de radar_items aqui, conforme spec do AG-06
      const { data: jobData, error: insertError } = await supabase
        .from('jobs')
        .insert({
          tenant_id: schedule.tenant_id,
          job_type: jobType,
          status: 'queued',
          priority: 50,
          payload: payload
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      jobsCreated++

      // 4. Emitir job_event
      await supabase.from('job_events').insert({
        job_id: jobData.id,
        tenant_id: schedule.tenant_id,
        event_type: 'job_created',
        message: `Scheduler created job for ${jobType}`,
        data_json: { schedule_id: schedule.id, mix_policy: schedule.mix_policy }
      })
    }

    return new Response(JSON.stringify({ ok: true, jobs_created: jobsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
