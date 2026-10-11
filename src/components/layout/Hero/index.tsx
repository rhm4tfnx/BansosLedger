import { LandingHero } from "./LandingHero";
import { LandingStatistics } from "./LandingDetails";
import { LandingWhy } from "./LandingWhy";

export function Hero() {
  return (
    <>
      <LandingHero />
      <LandingStatistics />
      <LandingWhy />
    </>
  );
}
