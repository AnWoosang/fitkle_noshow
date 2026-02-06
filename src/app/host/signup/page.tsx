"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { validatePhone } from "@/lib/validation";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HostSignupPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function handlePhoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const err = validatePhone(e.target.value);
    setPhoneError(err || "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setLoading(false);
      return;
    }

    try {
      // Create account via server API
      const res = await fetch("/api/host/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Auto-login after signup
      const supabase = createSupabaseBrowser();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: `${username}@app.trustkeeper.com`,
        password,
      });

      if (loginError) throw new Error(loginError.message);

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
          <CardTitle className="text-xl">{t("host.signup.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("host.signup.subtitle")}
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
                minLength={4}
                placeholder={t("host.signup.usernamePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="password">{t("common.field.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder={t("host.signup.passwordPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="name">{t("common.field.name")}</Label>
              <Input id="name" name="name" required placeholder={t("host.signup.namePlaceholder")} />
            </div>
            <div>
              <Label htmlFor="email">{t("common.field.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder={t("host.signup.emailPlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("common.field.phone")}</Label>
              <Input
                id="phone"
                name="phone"
                required
                placeholder={t("host.signup.phonePlaceholder")}
                onBlur={handlePhoneBlur}
              />
              {phoneError && (
                <p className="text-sm text-destructive mt-1">{phoneError}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("host.signup.signingUp") : t("common.signup")}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            {t("host.signup.hasAccount")}{" "}
            <Link href="/host/login" className="text-primary hover:underline">
              {t("common.login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
