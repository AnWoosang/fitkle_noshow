"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { validatePhone, validateFee, formatFee } from "@/lib/validation";
import { useLang } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateMeetupPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLang();
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [hostId, setHostId] = useState<string | null>(null);
  const [hostName, setHostName] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [feeError, setFeeError] = useState("");
  const [noFee, setNoFee] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/host/login");
        return;
      }

      setHostId(user.id);

      const { data: hostData } = await supabase
        .from("hosts")
        .select("name, phone")
        .eq("id", user.id)
        .single();

      if (hostData) {
        setHostName(hostData.name);
        setHostPhone(hostData.phone);
      }

      setAuthLoading(false);
    }
    checkAuth();
  }, [router]);

  function handlePhoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const err = validatePhone(e.target.value);
    setPhoneError(err || "");
  }

  function handleFeeBlur(e: React.FocusEvent<HTMLInputElement>) {
    const err = validateFee(e.target.value);
    setFeeError(err || "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const phone = formData.get("host_phone") as string;
    const fee = formData.get("fee") as string;

    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      setLoading(false);
      return;
    }

    if (!noFee && fee) {
      const feeErr = validateFee(fee);
      if (feeErr) {
        setFeeError(feeErr);
        setLoading(false);
        return;
      }
    }

    const feeDisplay = noFee ? null : (fee ? formatFee(fee) : null);

    const maxWaitlistRaw = formData.get("max_waitlist") as string;
    const maxWaitlist = maxWaitlistRaw ? Number(maxWaitlistRaw) : null;

    const body = {
      host_name: formData.get("host_name"),
      host_phone: phone,
      title: formData.get("title"),
      description: formData.get("description"),
      date: formData.get("date"),
      location: formData.get("location"),
      max_participants: Number(formData.get("max_participants")) || 10,
      max_waitlist: maxWaitlist,
      fee_display: feeDisplay,
      host_id: hostId,
    };

    try {
      const res = await fetch("/api/meetups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = `/manage/${data.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-[#2563EB]">{t("common.trustkeeper")}</Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
              {lang === "ko" ? "EN" : "KO"}
            </Button>
            <Link href="/host" className="text-sm text-[#6B7280] hover:text-[#111827] flex items-center gap-1">
              <i className="fas fa-arrow-left text-xs"></i> {t("common.dashboard")}
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#111827] mb-6">{t("create.title")}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("create.hostInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="host_name">{t("create.hostName")}</Label>
                <Input
                  id="host_name"
                  name="host_name"
                  required
                  placeholder={t("create.hostNamePlaceholder")}
                  defaultValue={hostName}
                />
              </div>
              <div>
                <Label htmlFor="host_phone">{t("create.hostPhone")}</Label>
                <Input
                  id="host_phone"
                  name="host_phone"
                  required
                  placeholder={t("create.hostPhonePlaceholder")}
                  defaultValue={hostPhone}
                  onBlur={handlePhoneBlur}
                />
                {phoneError && (
                  <p className="text-sm text-destructive mt-1">{phoneError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("create.meetupInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">{t("create.meetupTitle")}</Label>
                <Input id="title" name="title" required placeholder={t("create.meetupTitlePlaceholder")} />
              </div>
              <div>
                <Label htmlFor="description">{t("create.meetupDescription")}</Label>
                <Textarea id="description" name="description" placeholder={t("create.meetupDescriptionPlaceholder")} rows={3} />
              </div>
              <div>
                <Label htmlFor="date">{t("create.dateTime")}</Label>
                <Input id="date" name="date" type="datetime-local" required />
              </div>
              <div>
                <Label htmlFor="location">{t("create.location")}</Label>
                <Input id="location" name="location" required placeholder={t("create.locationPlaceholder")} />
              </div>
              <div>
                <Label htmlFor="max_participants">{t("create.maxParticipants")}</Label>
                <Input id="max_participants" name="max_participants" type="number" min={2} max={100} defaultValue={10} />
              </div>
              <div>
                <Label htmlFor="max_waitlist">{t("create.maxWaitlist")}</Label>
                <Input id="max_waitlist" name="max_waitlist" type="number" min={0} max={100} placeholder={t("create.maxWaitlistPlaceholder")} />
                <p className="text-xs text-muted-foreground mt-1">{t("create.maxWaitlistHint")}</p>
              </div>
              <div>
                <Label htmlFor="fee">{t("create.fee")}</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Button
                    type="button"
                    variant={noFee ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setNoFee(!noFee);
                      setFeeError("");
                    }}
                  >
                    {t("create.noFee")}
                  </Button>
                </div>
                {!noFee && (
                  <div className="mt-2">
                    <div className="relative">
                      <Input
                        id="fee"
                        name="fee"
                        type="number"
                        min={0}
                        placeholder={t("create.feePlaceholder")}
                        onBlur={handleFeeBlur}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{t("create.feeUnit")}</span>
                    </div>
                    {feeError && (
                      <p className="text-sm text-destructive mt-1">{feeError}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{t("create.feeHint")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full bg-[#2563EB] hover:bg-[#1E40AF]" size="lg" disabled={loading}>
            {loading ? t("create.creating") : t("create.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
