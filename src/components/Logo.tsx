import logoColor from "@/assets/captain_logo_color.svg";
import logoBlue from "@/assets/captain_logo_blue.svg";
import logoWhite from "@/assets/captain_logo_white.svg";
import logoBlack from "@/assets/captain_logo_black.svg";

type LogoVariant = "auto" | "white" | "black";

interface LogoProps {
  className?: string;
  variant?: LogoVariant;
  alt?: string;
}

/**
 * Captain logo. Default ("auto") shows full color in light mode and blue version in dark mode.
 * Use variant="white" or variant="black" for monochrome contexts (e.g. footer).
 */
export function Logo({ className, variant = "auto", alt = "Captain" }: LogoProps) {
  if (variant === "white") {
    return <img src={logoWhite} alt={alt} className={className} />;
  }
  if (variant === "black") {
    return <img src={logoBlack} alt={alt} className={className} />;
  }
  return (
    <>
      <img src={logoColor} alt={alt} className={`${className ?? ""} block dark:hidden`} />
      <img src={logoBlue} alt={alt} className={`${className ?? ""} hidden dark:block`} />
    </>
  );
}
