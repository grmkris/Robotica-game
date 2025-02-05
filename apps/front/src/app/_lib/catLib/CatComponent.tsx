"use client";

import { useAuth } from "@/app/auth/useAuth";
import { RiveCat } from "@/components/RiveCat";
import { CatProvider } from "./CatContext";
import { CatInterationPanel } from "./CatInterationPanel";
import { useGetCats } from "./catHooks";

export const CatComponent = () => {
  const { data: cats } = useGetCats();
  const catId = cats?.[0]?.id;

  // Early return if no cats
  if (!catId) return null;

  return (
    <CatProvider>
      <div className="fixed inset-0">
        <div className="flex h-full flex-col">
          {/* Cat sprite container */}
          <div className="relative h-[40vh] w-full shrink-0 sm:h-[50vh] lg:h-screen lg:w-screen">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <RiveCat />
            </div>
          </div>

          {/* Stats container */}
          <div className="relative h-[60vh] w-full sm:h-auto sm:flex-1">
            <CatInterationPanel catId={catId} />
          </div>
        </div>
      </div>
    </CatProvider>
  );
};
