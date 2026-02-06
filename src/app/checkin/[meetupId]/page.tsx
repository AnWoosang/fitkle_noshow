"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { validatePhone } from "@/lib/validation";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Meetup {
  id: string;
  title: string;
  date: string;
  location: string;
}

export default function SelfCheckinPage() {
  const params = useParams();
  const meetupId = params.meetupId as string;
  const { t, locale, lang, setLang } = useLang();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    participant_name?: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("meetups")
        .select("id, title, date, location")
        .eq("id", meetupId)
        .single();

      if (data) setMeetup(data);
      setLoading(false);
    }
    load();
  }, [meetupId]);

  function handlePhoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const err = validatePhone(e.target.value);
    setPhoneError(err || "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/self-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetup_id: meetupId, name, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, message: data.error });
      } else {
        setResult({
          success: true,
          message: data.message,
          participant_name: data.participant_name,
        });
      }
    } catch {
      setResult({ success: false, message: t("common.error") });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!meetup) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p>{t("common.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <header className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-[#2563EB]">{t("common.trustkeeper")}</span>
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
            {lang === "ko" ? "EN" : "KO"}
          </Button>
        </div>
      </header>
      <div className="flex items-center justify-center px-4 py-12" style={{minHeight: 'calc(100vh - 57px)'}}>
        <div className="w-full max-w-md space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{t("checkin.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">{meetup.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(meetup.date).toLocaleDateString(locale, {
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}{" "}
                · {meetup.location}
              </p>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="text-center space-y-3">
                  {result.success ? (
                    <>
                      <div className="text-4xl">✅</div>
                      <h3 className="text-lg font-semibold text-green-700">
                        {result.participant_name}{t("checkin.success")}
                      </h3>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl">❌</div>
                      <h3 className="text-lg font-semibold text-destructive">{t("checkin.failed")}</h3>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      <Button
                        variant="outline"
                        onClick={() => setResult(null)}
                        className="mt-2"
                      >
                        {t("checkin.retry")}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    {t("checkin.instruction")}
                  </p>
                  <div>
                    <Label htmlFor="name">{t("common.field.name")}</Label>
                    <Input id="name" name="name" required placeholder={t("checkin.namePlaceholder")} />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t("common.field.phone")}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      required
                      placeholder={t("checkin.phonePlaceholder")}
                      onBlur={handlePhoneBlur}
                    />
                    {phoneError && (
                      <p className="text-sm text-destructive mt-1">{phoneError}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full bg-[#2563EB] hover:bg-[#1E40AF]" disabled={submitting}>
                    {submitting ? t("checkin.submitting") : t("checkin.submitBtn")}
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
