"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HostLoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const supabase = createSupabaseBrowser();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: `${username}@app.trustkeeper.com`,
        password,
      });

      if (loginError) {
        throw new Error(t("host.login.error"));
      }

      window.location.href = "/host";
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#F3F4F6]">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-[#2563EB]">{t("common.trustkeeper")}</h1>
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
            {lang === "ko" ? "EN" : "KO"}
          </Button>
        </div>
        <p className="text-sm text-[#6B7280] mt-1">{t("common.subtitle")}</p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{t("host.login.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("host.login.subtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">{t("common.field.username")}</Label>
              <Input
                id="username"
                name="username"
                required
                placeholder={t("host.login.usernamePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="password">{t("common.field.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder={t("host.login.passwordPlaceholder")}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("host.login.loggingIn") : t("common.login")}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            {t("host.login.noAccount")}{" "}
            <Link href="/host/signup" className="text-primary hover:underline">
              {t("common.signup")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
