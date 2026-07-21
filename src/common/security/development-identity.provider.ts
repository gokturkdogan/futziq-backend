import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IdentityContext, IdentityProvider } from './identity.provider';

@Injectable()
export class DevelopmentIdentityProvider implements IdentityProvider {
  resolve(request: { headers: Record<string, string | string[] | undefined> }): IdentityContext {
    const header = request.headers['x-participant-id'] ?? request.headers['x-player-id'];
    const participantId = Array.isArray(header) ? header[0] : header;
    return { participantId: participantId ?? uuidv4() };
  }
}
