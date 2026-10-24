import Link from "next/link";

type AdminSection = "links" | "users";

const sections: Array<{ id: AdminSection; href: string; label: string }> = [
  { id: "links", href: "/admin", label: "Linkler" },
  { id: "users", href: "/admin/users", label: "Kullanıcılar" },
];

export function AdminSectionNav({ active }: { active: AdminSection }) {
  return (
    <nav
      aria-label="Admin bölümleri"
      className="mt-8 flex w-full max-w-md rounded-xl border border-white/10 bg-[#071a2e]/75 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_30px_rgba(2,8,18,0.35)]"
    >
      {sections.map((section) => {
        const isActive = section.id === active;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`flex min-w-0 flex-1 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold transition ${
              isActive
                ? "bg-[var(--color-green)] text-[#03160c] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                : "text-white/65 hover:bg-white/[0.055] hover:text-white"
            }`}
            href={section.href}
            key={section.id}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
