"use client";

import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <motion.div
      className="container mx-auto max-w-3xl px-4 py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header Section */}
      <header className="mb-12 text-center">
        <h1 className="font-pixel text-5xl text-primary">Meet Misha</h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
          Your AI-powered feline companion
        </p>
      </header>

      {/* Main Content */}
      <div className="space-y-8 text-lg">
        {/* Introduction Card */}
        <motion.div
          className="rounded-xl border border-primary/10 bg-card p-8 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xl leading-relaxed">
            Meet Cat Misha, your virtual feline companion! Cat Misha is an
            AI-powered cat that loves attention, playing games, and making new
            friends.
          </p>
        </motion.div>

        {/* Fun Facts Section */}
        <motion.div
          className="rounded-xl border border-primary/10 bg-card p-8 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-pixel mb-6 text-3xl text-primary">Fun Facts</h2>
          <ul className="list-none space-y-4">
            {[
              "🐭 Favorite activity: Chasing virtual mice",
              "🫳 Loves to be petted",
              "🍽️ Gets hungry every few hours",
              "😴 Takes short naps to recharge energy",
              "🎮 Has a playful personality",
            ].map((fact, index) => (
              <li
                key={fact}
                className="flex items-center border-b border-primary/10 py-2 text-xl last:border-0"
              >
                {fact}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Footer Section */}
        <motion.div
          className="rounded-xl border border-primary/10 bg-card p-8 text-center shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-xl leading-relaxed">
            Misha is more than just a virtual pet - they&apos;re an AI companion
            that learns and grows with you. Keep Misha happy by maintaining
            their happiness, energy, and hunger levels!
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
