import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GSCConnection {
  id: string;
  blog_id: string;
  site_url: string;
  is_active: boolean;
  last_sync_at: string | null;
  connected_at: string | null;
}

export function useGSCConnection(blogId: string | undefined) {
  const [connection, setConnection] = useState<GSCConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!blogId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("gsc_connections")
        .select("*")
        .eq("blog_id", blogId)
        .eq("is_active", true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setConnection(data);
    } catch (err) {
      console.error("Error fetching GSC connection:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch connection");
    } finally {
      setIsLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const connect = useCallback(async () => {
    if (!blogId) return;

    setIsConnecting(true);
    setError(null);
    try {
      const { data: configData, error: configError } = await supabase.functions.invoke(
        "get-gsc-config"
      );

      if (configError) throw configError;

      if (!configData?.configured) {
        throw new Error("Google OAuth não está configurado. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.");
      }

      const { clientId, redirectUri } = configData;
      const scope = "https://www.googleapis.com/auth/webmasters.readonly";
      const state = encodeURIComponent(JSON.stringify({ blogId, returnTo: window.location.pathname }));

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`;

      window.location.href = authUrl;
    } catch (err) {
      console.error("Error initiating GSC connection:", err);
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnecting(false);
    }
  }, [blogId]);

  const disconnect = useCallback(async () => {
    if (!blogId || !connection) return;

    try {
      const { error: disconnectError } = await supabase.functions.invoke(
        "disconnect-gsc",
        { body: { blogId } }
      );

      if (disconnectError) throw disconnectError;
      setConnection(null);
    } catch (err) {
      console.error("Error disconnecting GSC:", err);
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  }, [blogId, connection]);

  const handleCallback = useCallback(async (code: string, state: string) => {
    try {
      const { error: callbackError } = await supabase.functions.invoke(
        "gsc-callback",
        { body: { code, state } }
      );

      if (callbackError) throw callbackError;
      await fetchConnection();
    } catch (err) {
      console.error("Error handling GSC callback:", err);
      setError(err instanceof Error ? err.message : "Failed to complete connection");
    }
  }, [fetchConnection]);

  return {
    connection,
    isLoading,
    isConnecting,
    error,
    connect,
    disconnect,
    handleCallback,
    refetch: fetchConnection,
  };
}
