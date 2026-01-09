import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { OmniseenLogo } from "@/components/ui/OmniseenLogo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Mail, Lock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<"request" | "reset">("request");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);

  const emailSchema = z.string().email(t('auth.errors.invalidEmail'));
  const passwordSchema = z.string().min(6, t('auth.errors.passwordMin'));

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    
    if (accessToken && type === "recovery") {
      setMode("reset");
    }
  }, []);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = emailSchema.safeParse(email);
      if (!validation.success) {
        toast({
          title: t('auth.errors.validationError'),
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: t('common.error'),
          description: t('auth.errors.resetFailed'),
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({
          title: t('auth.reset.emailSent'),
          description: t('auth.reset.checkInbox'),
        });
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('auth.errors.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validation = passwordSchema.safeParse(password);
      if (!validation.success) {
        toast({
          title: t('auth.errors.validationError'),
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: t('common.error'),
          description: t('auth.errors.passwordMismatch'),
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: t('common.error'),
          description: t('auth.errors.resetFailed'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth.reset.passwordReset'),
          description: t('auth.reset.passwordUpdated'),
        });
        navigate("/auth");
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('auth.errors.unexpectedError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="mb-8">
            <OmniseenLogo size="lg" className="brightness-0 invert" />
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            {t('auth.branding.recoveryHeadline')}
          </h2>
          
          <p className="text-lg text-primary-foreground/80 max-w-md">
            {t('auth.branding.recoverySubheadline')}
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <OmniseenLogo size="md" />
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-display">
                {mode === "request" ? t('auth.reset.title') : t('auth.reset.newPasswordTitle')}
              </CardTitle>
              <CardDescription>
                {mode === "request" 
                  ? t('auth.reset.description') 
                  : t('auth.reset.newPasswordDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "request" && !success && (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.login.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('auth.reset.sendLink')
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate("/auth")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('auth.reset.backToLogin')}
                  </Button>
                </form>
              )}

              {mode === "request" && success && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{t('auth.reset.emailSent')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('auth.reset.checkInbox')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/auth")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('auth.reset.backToLogin')}
                  </Button>
                </div>
              )}

              {mode === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.reset.newPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Min. 6 characters"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('auth.reset.confirmPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        className="pl-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('auth.reset.resetPassword')
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
