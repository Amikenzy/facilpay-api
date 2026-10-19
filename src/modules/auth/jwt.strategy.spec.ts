jest.mock('otplib', () => ({ verifySync: jest.fn() }));
import { JwtStrategy } from './jwt.strategy';

describe('Session-bound access JWTs', () => {
  let strategy: JwtStrategy;
  let sessions: any;
  let auth: any;
  beforeEach(() => {
    sessions = { touchSession: jest.fn().mockResolvedValue({ id: 's1' }) };
    auth = { validateUser: jest.fn().mockResolvedValue({ id: 'u1', roles: [] }) };
    strategy = Object.assign(Object.create(JwtStrategy.prototype), { sessionsService: sessions, authService: auth });
  });
  it.each(['magic-link', 'two-factor-login', 'email-verification'])('rejects purpose-scoped %s tokens as access tokens', async purpose => {
    await expect(strategy.validate({ sub: 'u1', purpose })).rejects.toThrow();
    expect(auth.validateUser).not.toHaveBeenCalled();
  });
  it('updates activity for the verified user and session', async () => {
    await strategy.validate({ sub: 'u1', sid: 's1' });
    expect(sessions.touchSession).toHaveBeenCalledWith('s1', undefined, undefined, 'u1');
  });
  it('rejects expired or revoked sessions', async () => {
    sessions.touchSession.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'u1', sid: 's1' })).rejects.toThrow();
  });
  it('preserves existing access tokens until refresh supplies a session ID', async () => {
    await expect(strategy.validate({ sub: 'u1' })).resolves.toMatchObject({ id: 'u1' });
    expect(sessions.touchSession).not.toHaveBeenCalled();
  });
});
