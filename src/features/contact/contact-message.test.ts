import { describe, expect, it } from 'vitest';
import {
  ContactMessageRules,
  type ContactMessage,
} from '@/features/contact/contact-message';

const buildMessage = (overrides: Partial<ContactMessage> = {}): ContactMessage => ({
  name: 'Nicolás',
  email: 'someone@example.com',
  message: 'A message that is clearly long enough.',
  locale: 'es',
  sourceUrl: undefined,
  ...overrides,
});

describe('ContactMessageRules.validate', () => {
  it('returns no errors for a valid message', () => {
    expect(ContactMessageRules.validate(buildMessage())).toEqual([]);
  });

  it('flags a name shorter than the minimum (ignoring surrounding spaces)', () => {
    expect(ContactMessageRules.validate(buildMessage({ name: ' a ' }))).toContain(
      'name-too-short',
    );
  });

  it('flags an invalid email', () => {
    expect(ContactMessageRules.validate(buildMessage({ email: 'not-an-email' }))).toContain(
      'email-invalid',
    );
  });

  it('flags a message shorter than the minimum', () => {
    expect(ContactMessageRules.validate(buildMessage({ message: 'short' }))).toContain(
      'message-too-short',
    );
  });

  it('flags a message longer than the maximum', () => {
    const tooLong = 'x'.repeat(ContactMessageRules.MAXIMUM_MESSAGE_LENGTH + 1);
    expect(ContactMessageRules.validate(buildMessage({ message: tooLong }))).toContain(
      'message-too-long',
    );
  });

  it('accumulates every error at once', () => {
    const errors = ContactMessageRules.validate(
      buildMessage({ name: 'a', email: 'bad', message: 'short' }),
    );
    expect(errors).toEqual(['name-too-short', 'email-invalid', 'message-too-short']);
  });
});