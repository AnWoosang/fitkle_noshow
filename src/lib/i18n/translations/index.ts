import { commonKo, commonEn } from "./common";
import { landingKo, landingEn } from "./landing";
import { adminKo, adminEn } from "./admin";
import { hostKo, hostEn } from "./host";
import { meetupKo, meetupEn } from "./meetup";
import { createKo, createEn } from "./create";
import { manageKo, manageEn } from "./manage";

export const translations: Record<string, Record<string, string>> = {
  ko: {
    ...commonKo,
    ...landingKo,
    ...adminKo,
    ...hostKo,
    ...meetupKo,
    ...createKo,
    ...manageKo,
  },
  en: {
    ...commonEn,
    ...landingEn,
    ...adminEn,
    ...hostEn,
    ...meetupEn,
    ...createEn,
    ...manageEn,
  },
};
