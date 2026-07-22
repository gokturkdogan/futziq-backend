import {
  isRandomScopeCode,
  pickRandomPlayableScopeRule,
  RANDOM_SCOPE_CODE,
} from '../src/game-catalog/domain/catalog.constants';

describe('catalog.constants', () => {
  it('identifies random scope code', () => {
    expect(isRandomScopeCode(RANDOM_SCOPE_CODE)).toBe(true);
    expect(isRandomScopeCode('CAREER')).toBe(false);
  });

  it('picks only playable scope rules', () => {
    const rules = [
      { id: 'random', scope: { code: RANDOM_SCOPE_CODE } },
      { id: 'career', scope: { code: 'CAREER' } },
      { id: 'club', scope: { code: 'CLUB' } },
    ];

    const picked = pickRandomPlayableScopeRule(rules);
    expect(picked?.scope.code).not.toBe(RANDOM_SCOPE_CODE);
  });
});
