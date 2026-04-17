import logoColor from "@/assets/captain_logo_color.svg";
import logoBlue from "@/assets/captain_logo_blue.svg";
import logoWhite from "@/assets/captain_logo_white.svg";
import logoBlack from "@/assets/captain_logo_black.svg";
import logoHatColor from "@/assets/captain_logo_hat_color.svg";
import logoHatBlue from "@/assets/captain_logo_hat_blue.svg";

type LogoVariant = "auto" | "white" | "black" | "hat";

interface LogoProps {
  className?: string;
  variant?: LogoVariant;
  alt?: string;
}

/**
 * Captain logo. Default ("auto") shows full color in light mode and blue version in dark mode.
 * variant="hat" shows the icon-only (hat) mark, also theme-aware.
 * variant="white"/"black" for monochrome contexts (e.g. footer).
 */
export function Logo({ className, variant = "auto", alt = "Captain" }: LogoProps) {
  if (variant === "white") {
    return <img src={logoWhite} alt={alt} className={className} />;
  }
  if (variant === "black") {
    return <img src={logoBlack} alt={alt} className={className} />;
  }
  if (variant === "hat") {
    return (
      <>
        <img src={logoHatColor} alt={alt} className={`${className ?? ""} block dark:hidden`} />
        <img src={logoHatBlue} alt={alt} className={`${className ?? ""} hidden dark:block`} />
      </>
    );
  }
  return (
    <>
      <img src={logoColor} alt={alt} className={`${className ?? ""} block dark:hidden`} />
      <img src={logoBlue} alt={alt} className={`${className ?? ""} hidden dark:block`} />
    </>
  );
}
