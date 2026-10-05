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
  passesHref?: string;
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
  passesHref = "/passes",
}: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div aria-hidden="true" className="h-18.25" />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-secondary bg-background font-sans text-foreground">
        <nav
          // section untuk mengatur fixed navbar
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
            {/* logo section */}
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
            {/* min-width 1025px */}
            <ul className="hidden min-w-0 flex-1 min-[1025px]:flex">
              {links.map((link, index) => (
                <li
                  key={link.href}
                  className={`flex min-w-0 border-r border-secondary ${index === links.length - 1 ? "flex-[2.5]" : "flex-1"}`}
                >
                  <Link href={link.href} className={`${cellStyle} w-full`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            {/* min-width 641 */}
            <div className="hidden min-w-0 flex-1 min-[641px]:flex min-[1025px]:hidden">
              {links[0] && (
                <Link
                  href={links[0].href}
                  className={`${cellStyle} border-r border-secondary`}
                >
                  {links[0].label}
                </Link>
              )}
              {links.slice(1, 3).map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${cellStyle} hidden shrink-0 border-r border-secondary ${index === 0 ? "min-[769px]:flex" : "min-[960px]:flex"}`}
                >
                  {link.label}
                </Link>
              ))}
              <div
                className="relative flex flex-1"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    setOpen(false);
                }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`${menuId}-tablet`}
                  onClick={() => setOpen(!open)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setOpen(false);
                      event.currentTarget.focus();
                      event.stopPropagation();
                    }
                  }}
                  className={`${cellStyle} w-full border-r border-secondary`}
                >
                  More
                  <ChevronDown
                    className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                <ul
                  id={`${menuId}-tablet`}
                  hidden={!open}
                  className="absolute top-full left-0 z-20 min-w-52 border border-secondary bg-background shadow-sm"
                >
                  {links.slice(1).map((link, index) => (
                    <li
                      key={link.href}
                      className={
                        index === 0
                          ? "min-[769px]:hidden"
                          : index === 1
                            ? "min-[960px]:hidden"
                            : undefined
                      }
                    >
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={`${cellStyle} min-h-14`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* dashboard section */}
            <Link
              href={signInHref}
              className={`${cellStyle} hidden min-w-28 border-r border-secondary min-[641px]:flex min-[1025px]:w-[11%]`}
            >
              Dashboard <UserRound className="size-4" aria-hidden="true" />
            </Link>
            {/* data public section */}
            <Link
              href={passesHref}
              className="ml-auto hidden items-center justify-center gap-2 min-[641px]:flex bg-primary px-3 text-sm font-semibold whitespace-nowrap text-surface transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-surface min-[1025px]:gap-4 min-[1025px]:px-4 min-[1025px]:text-base min-[1025px]:ml-0 min-[1025px]:w-[11%] min-[1025px]:min-w-max min-[1025px]:shrink-0 min-[1025px]:justify-start"
            >
              Lihat data Publik{" "}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            {/* hamburger menu tampil ketika size window sesuai dengan mobile */}
            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Tutup Menu" : "Buka Menu"}
              onClick={() => setOpen(!open)}
              className={`ml-auto flex w-20 shrink-0 items-center justify-center hover:bg-secondary min-[641px]:hidden ${focusStyle}`}
            >
              {open ? (
                <X className="size-7" aria-hidden="true" />
              ) : (
                <span className="flex w-8 flex-col gap-1.5" aria-hidden="true">
                  <span className="h-px w-full bg-foreground/60" />
                  <span className="h-px w-full bg-foreground/60" />
                </span>
              )}
            </button>
            {/* menu section ketika hambuerger aktif */}
          </div>
          <div
            id={menuId}
            hidden={!open}
            className="border-t border-secondary min-[641px]:hidden"
          >
            <ul>
              {links.map((link) => (
                <li key={link.href} className="border-b border-secondary">
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`${cellStyle} min-h-14`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={signInHref}
              onClick={() => setOpen(false)}
              className={`${cellStyle} min-h-14 justify-between`}
            >
              Dashboard <UserRound className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={passesHref}
              onClick={() => setOpen(false)}
              className={`flex min-h-14 items-center justify-between gap-2 bg-primary px-4 font-semibold text-surface transition-colors hover:bg-primary-hover ${focusStyle}`}
            >
              Lihat data Publik{" "}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
