import { Injectable } from '@nestjs/common';
import { SupportedLocale } from '../../common/locale/locale.constants';
import { LineupSlotDefinition } from '../../game-engine/contracts/game-types';

const SLOT_TRANSLATIONS: Record<string, Record<SupportedLocale, string>> = {
  GK: { tr: 'Kaleci', en: 'Goalkeeper' },
  DEF1: { tr: 'Defans', en: 'Defender' },
  DEF2: { tr: 'Defans', en: 'Defender' },
  MID1: { tr: 'Orta Saha', en: 'Midfield' },
  MID2: { tr: 'Orta Saha', en: 'Midfield' },
  ATT: { tr: 'Forvet', en: 'Attack' },
  LB: { tr: 'Sol Bek', en: 'Left Back' },
  LCB: { tr: 'Sol Stoper', en: 'Left Centre Back' },
  RCB: { tr: 'Sağ Stoper', en: 'Right Centre Back' },
  RB: { tr: 'Sağ Bek', en: 'Right Back' },
  LCM: { tr: 'Sol Orta Saha', en: 'Left Central Midfielder' },
  RCM: { tr: 'Sağ Orta Saha', en: 'Right Central Midfielder' },
  LW: { tr: 'Sol Kanat', en: 'Left Winger' },
  CAM: { tr: 'Ofansif Orta Saha', en: 'Attacking Midfielder' },
  RW: { tr: 'Sağ Kanat', en: 'Right Winger' },
  ST: { tr: 'Forvet', en: 'Striker' },
};

@Injectable()
export class LocalizedConfigService {
  resolveSlotDisplayName(slot: LineupSlotDefinition, locale: string): string {
    const localized = SLOT_TRANSLATIONS[slot.code];
    if (localized) {
      return localized[locale as SupportedLocale] ?? localized.en ?? slot.displayName;
    }
    return slot.displayName;
  }

  localizeLineupTemplate(
    template: { code: string; name: string; slots: LineupSlotDefinition[] },
    locale: string,
  ) {
    return {
      ...template,
      slots: template.slots.map((slot) => ({
        ...slot,
        displayName: this.resolveSlotDisplayName(slot, locale),
      })),
    };
  }
}
