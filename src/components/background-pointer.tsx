// Sprint 6 — Performans acil düzeltmesi.
//
// Eski sürüm `pointermove` event'i ile `--bg-pointer-x`, `--bg-pointer-y` ve
// `--bg-shift-*` CSS değişkenlerini her hareket frame'inde günceller, ardından
// body, body::before, .app-shell::before, .dashboard-kit-top::before ve
// .auth-shell::before katmanlarındaki 4-6 katmanlı radial-gradient stack'i
// yeniden hesaplattırırdı. Güçlü makinede bile compositor'ı zorlayarak
// belirgin kasmaya yol açıyordu.
//
// CSS değişkenleri `:root` içinde sabit, makul default'lara sahip
// (`--bg-pointer-x: 50%`, `--bg-pointer-y: 38%`, `--bg-shift-*: 0px`), yani
// JS hiç çalışmadığında bile gradient'ler statik bir orta-üst hotspot ile
// doğru görünür. Tek kaybedilen şey pointer'a tepki veren ince ışık kayması
// — gerekirse ileride hover-capable + reduced-motion sonrası throttle ile
// geri eklenebilir; ama varsayılan davranış artık paint-friendly.
export function BackgroundPointer() {
  return null;
}
