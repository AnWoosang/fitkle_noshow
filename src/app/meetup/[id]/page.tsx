"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validatePhone } from "@/lib/validation";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Meetup {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string;
  max_participants: number;
  max_waitlist: number | null;
  fee_display: string | null;
  host_name: string;
  status: string;
}

export default function MeetupDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { t, locale, lang, setLang } = useLang();

  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ is_waitlisted: boolean } | null>(null);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: meetupData } = await supabase
        .from("meetups")
        .select("*")
        .eq("id", id)
        .single();

      if (meetupData) setMeetup(meetupData);

      const { count } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("meetup_id", id)
        .eq("is_waitlisted", false)
        .not("status", "eq", "cancelled");

      setParticipantCount(count || 0);

      const { count: wCount } = await supabase
        .from("participants")
        .select("*", { count: "exact", head: true })
        .eq("meetup_id", id)
        .eq("is_waitlisted", true)
        .not("status", "eq", "cancelled");

      setWaitlistCount(wCount || 0);
      setLoading(false);
    }
    load();
  }, [id]);

  function handlePhoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const err = validatePhone(e.target.value);
    setPhoneError(err || "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get("phone") as string;

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetup_id: id,
          name: formData.get("name"),
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted({ is_waitlisted: data.is_waitlisted });
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

  if (!meetup) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p>{t("common.notFound")}</p>
      </div>
    );
  }

  const isFull = participantCount >= meetup.max_participants;
  const isWaitlistFull = meetup.max_waitlist !== null && waitlistCount >= meetup.max_waitlist;
  const isClosed = isFull && isWaitlistFull;
  const eventDate = new Date(meetup.date);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <header className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#2563EB]">{t("common.trustkeeper")}</Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
              {lang === "ko" ? "EN" : "KO"}
            </Button>
            <Link href="/" className="text-sm text-[#6B7280] hover:text-[#111827] flex items-center gap-1">
              <i className="fas fa-arrow-left text-xs"></i> {t("meetup.detail.home")}
            </Link>
          </div>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl">{meetup.title}</CardTitle>
              <Badge variant={meetup.status === "upcoming" ? "default" : "secondary"}>
                {meetup.status === "upcoming" ? t("common.status.upcoming") : meetup.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {meetup.description && (
              <p className="text-sm text-muted-foreground">{meetup.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("common.field.date")}</span>
                <p className="font-medium">
                  {eventDate.toLocaleDateString(locale, {
                    year: "numeric", month: "long", day: "numeric", weekday: "short",
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.time")}</span>
                <p className="font-medium">
                  {eventDate.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.location")}</span>
                <p className="font-medium">{meetup.location}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.host")}</span>
                <p className="font-medium">{meetup.host_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.field.participants")}</span>
                <p className="font-medium">{t("meetup.detail.count").replace("{count}", String(participantCount)).replace("{max}", String(meetup.max_participants))}</p>
              </div>
              {meetup.fee_display && (
                <div>
                  <span className="text-muted-foreground">{t("common.field.fee")}</span>
                  <p className="font-medium">{meetup.fee_display}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {submitted ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6 text-center space-y-2">
              {submitted.is_waitlisted ? (
                <>
                  <h3 className="text-lg font-semibold">{t("meetup.detail.registeredAsWaitlist")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("meetup.detail.waitlistDesc")}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold">{t("meetup.detail.registered")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("meetup.detail.registeredDesc")}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : isClosed ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6 text-center space-y-2">
              <h3 className="text-lg font-semibold">{t("meetup.detail.closed")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("meetup.detail.closedDesc")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isFull ? t("meetup.detail.applyAsWaitlist") : t("meetup.detail.apply")}
              </CardTitle>
              {isFull && (
                <p className="text-sm text-muted-foreground">
                  {t("meetup.detail.waitlistFull")}
                  {meetup.max_waitlist !== null && (
                    <> ({t("meetup.detail.waitlistCount").replace("{current}", String(waitlistCount)).replace("{max}", String(meetup.max_waitlist))})</>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("common.field.name")}</Label>
                  <Input id="name" name="name" required placeholder={t("meetup.detail.namePlaceholder")} />
                </div>
                <div>
                  <Label htmlFor="phone">{t("common.field.phone")}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    required
                    placeholder={t("meetup.detail.phonePlaceholder")}
                    onBlur={handlePhoneBlur}
                  />
                  {phoneError && (
                    <p className="text-sm text-destructive mt-1">{phoneError}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? t("common.processing")
                    : isFull
                    ? t("meetup.detail.submitWaitlist")
                    : t("meetup.detail.submitApply")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
