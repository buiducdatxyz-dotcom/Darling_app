import assert from 'node:assert/strict';
import test from 'node:test';
import { validateRegistrationCredentials } from '../src/utils/registration';

test('registration rejects a five-character password before onboarding', () => {
  assert.match(
    validateRegistrationCredentials('person@example.com', 'abc12', 'abc12') ?? '',
    /ít nhất 8 ký tự/
  );
});

test('registration accepts an eight-character password', () => {
  assert.equal(validateRegistrationCredentials(' Person@Example.com ', 'abc12345', 'abc12345'), null);
});

test('registration reports confirmation mismatch', () => {
  assert.equal(
    validateRegistrationCredentials('person@example.com', 'abc12345', 'abc12346'),
    'Mật khẩu không khớp!'
  );
});

test('registration rejects an invalid email before moving to onboarding', () => {
  assert.match(
    validateRegistrationCredentials('not-an-email', 'abc12345', 'abc12345') ?? '',
    /Email chưa đúng định dạng/
  );
});
