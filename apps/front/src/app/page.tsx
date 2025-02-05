import { CatComponent } from "@/app/_lib/catLib/CatComponent";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Page() {
  return (
    <div className="relative h-full">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <CatComponent />
    </div>
  );
}
