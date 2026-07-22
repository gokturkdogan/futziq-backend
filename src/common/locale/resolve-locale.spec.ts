import { resolveLocale } from './resolve-locale';

describe('resolveLocale', () => {
  it('prefers query locale when supported', () => {
    expect(resolveLocale({ queryLocale: 'en', acceptLanguage: 'tr' })).toBe('en');
  });

  it('uses accept-language when query is missing', () => {
    expect(resolveLocale({ acceptLanguage: 'en-US,en;q=0.9' })).toBe('en');
  });

  it('falls back to tr for unsupported values', () => {
    expect(resolveLocale({ queryLocale: 'de', acceptLanguage: 'fr' })).toBe('tr');
  });
});
