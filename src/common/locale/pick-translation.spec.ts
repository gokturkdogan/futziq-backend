import { pickTranslation } from './pick-translation';

describe('pickTranslation', () => {
  const rows = [
    { locale: 'tr', title: 'Hedef Avı', description: 'TR desc' },
    { locale: 'en', title: 'Target Hunt', description: 'EN desc' },
  ];

  it('returns requested locale when available', () => {
    expect(pickTranslation(rows, 'en')).toEqual({
      title: 'Target Hunt',
      description: 'EN desc',
      fallbackUsed: false,
    });
  });

  it('falls back to tr when requested locale is missing', () => {
    expect(pickTranslation(rows, 'de')).toEqual({
      title: 'Hedef Avı',
      description: 'TR desc',
      fallbackUsed: true,
    });
  });

  it('uses legacy columns when translations are empty', () => {
    expect(
      pickTranslation([], 'en', { title: 'Legacy', description: 'Legacy desc' }),
    ).toEqual({
      title: 'Legacy',
      description: 'Legacy desc',
      fallbackUsed: true,
    });
  });
});
