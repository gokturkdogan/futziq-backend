export interface IdentityContext {
  participantId: string;
}

export interface IdentityProvider {
  resolve(request: { headers: Record<string, string | string[] | undefined> }): IdentityContext;
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
