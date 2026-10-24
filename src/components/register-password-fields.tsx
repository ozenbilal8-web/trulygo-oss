"use client";

import { useState } from "react";

const MIN_LENGTH = 8;
const MISMATCH_MESSAGE = "Şifreler eşleşmiyor.";
const TOO_SHORT_MESSAGE = `Şifre en az ${MIN_LENGTH} karakter olmalıdır.`;

export function RegisterPasswordFields() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordTooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <>
      <label className="grid gap-2 text-sm font-semibold text-white/85">
        Şifre
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            event.target.setCustomValidity(
              event.target.value.length > 0 && event.target.value.length < MIN_LENGTH
                ? TOO_SHORT_MESSAGE
                : "",
            );
          }}
          className="form-field"
        />
        {passwordTooShort ? (
          <span className="checkbox-error" role="alert">
            {TOO_SHORT_MESSAGE}
          </span>
        ) : null}
      </label>
      <label className="grid gap-2 text-sm font-semibold text-white/85">
        Şifre tekrar
        <input
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          required
          value={confirm}
          onChange={(event) => {
            const value = event.target.value;
            setConfirm(value);
            event.target.setCustomValidity(
              value.length > 0 && value !== password ? MISMATCH_MESSAGE : "",
            );
          }}
          onInvalid={(event) => {
            if (confirm.length > 0 && confirm !== password) {
              event.currentTarget.setCustomValidity(MISMATCH_MESSAGE);
            }
          }}
          className="form-field"
        />
        {mismatch ? (
          <span className="checkbox-error" role="alert">
            {MISMATCH_MESSAGE}
          </span>
        ) : null}
      </label>
    </>
  );
}
