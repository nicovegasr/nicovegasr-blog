import type { Locale } from '@/features/shared/domain/locale';

export type ContactMessage = {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly locale: Locale;
  readonly sourceUrl: string | undefined;
};

export type ContactValidationError =
  | 'name-too-short'
  | 'email-invalid'
  | 'message-too-short'
  | 'message-too-long';

export class ContactMessageRules {
  static readonly MINIMUM_NAME_LENGTH = 2;
  static readonly MINIMUM_MESSAGE_LENGTH = 10;
  static readonly MAXIMUM_MESSAGE_LENGTH = 5000;
  static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static validate(input: ContactMessage): ContactValidationError[] {
    const errors: ContactValidationError[] = [];

    if (input.name.trim().length < ContactMessageRules.MINIMUM_NAME_LENGTH) {
      errors.push('name-too-short');
    }
    if (!ContactMessageRules.EMAIL_PATTERN.test(input.email)) {
      errors.push('email-invalid');
    }
    if (input.message.trim().length < ContactMessageRules.MINIMUM_MESSAGE_LENGTH) {
      errors.push('message-too-short');
    }
    if (input.message.length > ContactMessageRules.MAXIMUM_MESSAGE_LENGTH) {
      errors.push('message-too-long');
    }

    return errors;
  }
}
