"use client";

import { motion } from "framer-motion";

const cubeVariants = {
  animate: (custom: { w: number; l: number; h: number }) => ({
    transform: [
      `translate(
        ${custom.w * -50 - 50 + (custom.l * 50 + 50)}%,
        ${custom.h * 50 - 200 + (custom.w * 25 - 25) + (custom.l * 25 + 25)}%
      )`,
      `translate(
        ${custom.w * -50 - 50 + (custom.l * 100 - 50)}%,
        ${custom.h * 50 - 200 + (custom.w * 25 - 25) + (custom.l * 50 - 25)}%
      )`,
      `translate(
        ${custom.w * -100 + 50 + (custom.l * 100 - 50)}%,
        ${custom.h * 50 - 200 + (custom.w * 50 - 75) + (custom.l * 50 - 25)}%
      )`,
      `translate(
        ${custom.w * -100 - 100 + (custom.l * 100 + 100)}%,
        ${custom.h * 100 - 400 + (custom.w * 50 - 50) + (custom.l * 50 + 50)}%
      )`,
      `translate(
        ${custom.w * -50 - 50 + (custom.l * 50 + 50)}%,
        ${custom.h * 50 - 200 + (custom.w * 25 - 25) + (custom.l * 25 + 25)}%
      )`,
    ],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
    },
  }),
};

const Cube = ({ w, l, h }: { w: number; l: number; h: number }) => (
  <motion.div
    className="absolute h-[100px] w-[86px]"
    variants={cubeVariants}
    animate="animate"
    custom={{ w, l, h }}
    style={{ zIndex: -h }}
  >
    <div
      className="absolute h-[50px] w-[50px] origin-[0_0] bg-cyan-400 [transform:rotate(210deg)_skew(-30deg)_translate(-75px,-22px)_scaleY(0.86)]"
      style={{ zIndex: 2, boxShadow: "0 0 15px #2DD4BF" }}
    />
    <div
      className="absolute h-[50px] w-[50px] origin-[0_0] bg-cyan-900 [transform:rotate(90deg)_skewX(-30deg)_scaleY(0.86)_translate(25px,-50px)]"
      style={{ boxShadow: "0 0 10px #164E63" }}
    />
    <div
      className="absolute h-[50px] w-[50px] origin-[0_0] bg-cyan-600 [transform:rotate(-30deg)_skewX(-30deg)_translate(49px,65px)_scaleY(0.86)]"
      style={{ boxShadow: "0 0 12px #0891B2" }}
    />
  </motion.div>
);

export function IsometricLoader() {
  return (
    <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center backdrop-blur-sm">
      <div className="relative h-[100px] w-[86px] scale-[0.5]">
        {[1, 2, 3].map((h) =>
          [1, 2, 3].map((w) =>
            [1, 2, 3].map((l) => (
              <Cube key={`${h}-${w}-${l}`} h={h} w={w} l={l} />
            )),
          ),
        )}
      </div>
    </div>
  );
}
