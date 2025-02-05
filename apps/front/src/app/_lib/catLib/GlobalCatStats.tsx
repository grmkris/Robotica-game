"use client";

import { useCatState, useGetCats } from "@/app/_lib/catLib/catHooks";
import { motion } from "framer-motion";
import { Battery, Cat, Heart, Pizza } from "lucide-react";
import { useRouter } from "next/navigation";

export function GlobalCatStats() {
  const router = useRouter();
  const { data: cats } = useGetCats();
  const { data: catState, isLoading } = useCatState(cats?.[0]?.id);

  if (isLoading || !catState) return null;

  return (
    <motion.div
      className="font-pixel fixed top-6 z-50 mx-2 w-[95%] -translate-x-1/2 md:left-6 md:w-auto md:translate-x-0"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-row items-center gap-1.5 rounded-xl border border-border bg-gradient-to-b from-background to-card p-1.5 shadow-md md:gap-6 md:px-6 md:py-3">
        <div className="flex items-center gap-1.5 md:gap-3">
          <div className="rounded-full bg-gradient-to-br from-primary to-primary/80 p-1 shadow-inner md:p-2.5">
            <Cat className="size-4 text-background md:size-8" />
          </div>
          <span
            className="cursor-pointer text-base font-bold text-primary transition-colors hover:text-primary/80 md:text-2xl"
            onClick={() => router.push("/about")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                router.push("/about");
              }
            }}
          >
            {catState.name}
          </span>
        </div>

        <div className="flex gap-1 md:gap-4">
          <motion.div
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-background to-card px-2 py-1 shadow-md md:gap-2.5 md:px-4 md:py-2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="rounded-full bg-gradient-to-br from-red-500 to-red-600 p-1 md:p-1.5">
              <Heart className="size-4 text-background md:size-6" />
            </div>
            <span className="text-base font-bold text-red-500 md:text-xl">
              {catState.happiness}
            </span>
          </motion.div>

          <motion.div
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-background to-card px-2 py-1 shadow-md md:gap-2.5 md:px-4 md:py-2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 p-1 md:p-1.5">
              <Battery className="size-4 text-background md:size-6" />
            </div>
            <span className="text-base font-bold text-yellow-500 md:text-xl">
              {catState.energy}
            </span>
          </motion.div>

          <motion.div
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-background to-card px-2 py-1 shadow-md md:gap-2.5 md:px-4 md:py-2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="rounded-full bg-gradient-to-br from-orange-500 to-orange-600 p-1 md:p-1.5">
              <Pizza className="size-4 text-background md:size-6" />
            </div>
            <span className="text-base font-bold text-orange-500 md:text-xl">
              {catState.hunger}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
