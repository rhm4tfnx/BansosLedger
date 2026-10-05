"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ChevronDown, UserRound, X } from "lucide-react";
import { ReactNode, useId, useRef, useState } from "react";

export type NavbarLink = {
  label: string;
  href: string;
};

export type NavbarProps = {
  logo?: ReactNode;
  homeHref?: string;
  links?: readonly NavbarLink[];
  signInHref?: string;
  passeshref?: string;
};

const defaultLinks: readonly NavbarLink[] = [
  { label: "Tentang", href: "/about" },
  { label: "Fitur", href: "/fitur" },
  { label: "Alur Sistem", href: "/alur" },
  { label: "FAQ", href: "/faq" },
];

const focusStyle =
  "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary";
const cellStyle =
  "flex items-center gap-2 px-3 text-sm min-[1025px]:px-4 min-[1025px]:text-base font-medium transition-colors hover:bg-secondary ${focusStyle}";

const Navbar = ({
  logo,
  homeHref = "/",
  links = defaultLinks,
  signInHref = "/sign-in",
  passeshref = "/passes",
}: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div aria-hidden="true" className="h-18.25" />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-secondary bg-background font-sans text-foreground">
        <nav
          aria-label="Navigasi Utama"
          className="mx-auto max-w-[1920px] border-secondary min-[641px]:border-x min-[901px]:mx-0 min-[901px]:max-w-none min-[901px]:border-x-0 min-[901px]:px-0"
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              setOpen(false);
              menuButton.current?.focus();
            }
          }}
        >
          <div className="flex h-18 items-stretch">
            <Link
              href={homeHref}
              aria-label="Beranda"
              className="flex shrink-0 items-center justify-center border-secondary px-4 min-[641px]:border-r ${focusStyle}"
              onClick={() => setOpen(false)}
            >
              {logo ?? (
                <span className="flex h-10 w-25 items-center justify-center overflow-hidden sm:w-34">
                  <Image
                    src="/images/logo.png"
                    alt="BansosLedger"
                    width={2145}
                    height={733}
                    className="h-auto w-34 max-w-none shrink-0 mix-blend-multiply sm:w-46.5"
                  />
                </span>
              )}
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
