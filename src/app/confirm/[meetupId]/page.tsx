"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ParticipantWithMeetup {
  id: string;
  name: string;
  status: string;
  meetups: {
    title: string;
    date: string;
    location: string;
  };
}

export default function ConfirmPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { t, locale, lang, setLang } = useLang();

  const [participant, setParticipant] = useState<ParticipantWithMeetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("participants")
        .select("id, name, status, meetups(title, date, location)")
        .eq("token", token)
        .single();

      if (data) setParticipant(data as unknown as ParticipantWithMeetup);
      setLoading(false);
    }
    if (token) load();
    else setLoading(false);
  }, [token]);

  async function handleAction(action: "confirm" | "cancel") {
    setSubmitting(true);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.status);
    } catch (err) {
      alert(err instanceof Error ? err.message : t("common.error"));
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

  if (!participant) {
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
        <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 57px)'}}>
          <Card className="w-full max-w-md shadow-sm">
            <CardContent className="pt-6 text-center">
              <p>{t("common.participantNotFound")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Already processed
  if (participant.status !== "registered" && !result) {
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
        <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 57px)'}}>
          <Card className="w-full max-w-md shadow-sm">
            <CardContent className="pt-6 text-center space-y-2">
              <h3 className="text-lg font-semibold">{t("confirm.alreadyProcessed")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("confirm.currentStatus")}: {participant.status === "confirmed" ? t("confirm.statusConfirmed") : participant.status === "cancelled" ? t("confirm.statusCancelled") : participant.status}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (result) {
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
        <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 57px)'}}>
          <Card className="w-full max-w-md shadow-sm">
            <CardContent className="pt-6 text-center space-y-2">
              {result === "confirmed" ? (
                <>
                  <h3 className="text-lg font-semibold">{t("confirm.confirmed")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {participant.meetups.title}{t("confirm.confirmedDesc")}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">{t("confirm.cancelled")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("confirm.cancelledDesc")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const meetupDate = new Date(participant.meetups.date);

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
      <div className="flex items-center justify-center px-4" style={{minHeight: 'calc(100vh - 57px)'}}>
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{t("confirm.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-lg">
                <strong>{participant.name}</strong>{lang === "ko" ? "님," : ","}
              </p>
              <p className="text-lg">
                {t("confirm.question").replace("{title}", participant.meetups.title).split("\n").map((line, i) => (
                  <span key={i}>{i > 0 && <br />}{line}</span>
                ))}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">{t("confirm.dateLabel")}</span>
                {meetupDate.toLocaleDateString(locale, {
                  month: "long", day: "numeric", weekday: "short",
                })}{" "}
                {meetupDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p>
                <span className="text-muted-foreground">{t("confirm.locationLabel")}</span>
                {participant.meetups.location}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-[#2563EB] hover:bg-[#1E40AF]"
                size="lg"
                onClick={() => handleAction("confirm")}
                disabled={submitting}
              >
                {t("confirm.confirmBtn")}
              </Button>
              <Button
                className="flex-1"
                size="lg"
                variant="outline"
                onClick={() => handleAction("cancel")}
                disabled={submitting}
              >
                {t("confirm.cancelBtn")}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {t("confirm.noResponseNote")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
