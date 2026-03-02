/**
 * Feature flag para o Radar V3 Intelligence Discovery Engine.
 * Controla a ativação/desativação do Radar V3 sem afetar o Article Engine.
 *
 * Env var: VITE_RADAR_V3_ENABLED
 *   - "true" → Radar V3 ativo
 *   - qualquer outro valor / ausente → Radar V3 desativado (tela de manutenção)
 */
export function useRadarV3Flag(): boolean {
    const raw = import.meta.env.VITE_RADAR_V3_ENABLED;
    return raw === 'true' || raw === true;
}
