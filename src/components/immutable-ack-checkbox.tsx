"use client";

import { useState } from "react";

const immutableAckMessage =
  "Devam etmek için hedef adresin onay sonrası değiştirilemeyeceğini kabul etmelisin.";

export function ImmutableAckCheckbox() {
  const [showWarning, setShowWarning] = useState(false);

  return (
    <div className="checkbox-block">
      <label className={`checkbox-row ${showWarning ? "is-error" : ""}`}>
        <input
          type="checkbox"
          name="immutable_acknowledgement"
          value="accepted"
          required
          onInvalid={(event) => {
            event.currentTarget.setCustomValidity(immutableAckMessage);
            setShowWarning(true);
          }}
          onChange={(event) => {
            event.currentTarget.setCustomValidity("");
            setShowWarning(!event.currentTarget.checked);
          }}
        />
        <span>
          Onaylandıktan sonra bu linkin hedefini değiştiremeyeceğimi anlıyorum.
          Hedefi güncellemek istersem yeni bir talep oluştururum.
        </span>
      </label>
      {showWarning ? (
        <p className="checkbox-error" role="alert">
          {immutableAckMessage}
        </p>
      ) : null}
    </div>
  );
}
