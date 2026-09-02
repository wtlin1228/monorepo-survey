import type { ReactNode } from "react";
import { ColorBrandPrimary, ColorBrandGrayDark } from "@acme/design-tokens";

export interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

export function Button({ children, variant = "primary", onClick }: ButtonProps) {
  const background = variant === "primary" ? ColorBrandPrimary : ColorBrandGrayDark;
  return (
    <button className={`btn btn-${variant}`} style={{ background }} onClick={onClick}>
      {children}
    </button>
  );
}
