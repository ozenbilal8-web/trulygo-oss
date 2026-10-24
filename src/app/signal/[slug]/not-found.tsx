import { SignalUnavailable } from "./signal-unavailable";

export default function SignalNotFound() {
  return (
    <SignalUnavailable
      description="Bu anket hiç oluşturulmamış, taslakta kalmış veya artık yayında olmayabilir."
      title="Bu Signal anketi yayında değil."
    />
  );
}
