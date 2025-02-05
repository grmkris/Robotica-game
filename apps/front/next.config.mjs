import createJiti from "jiti";
import { fileURLToPath } from "node:url";

const jiti = createJiti(fileURLToPath(import.meta.url));

const serverEnvPath = "./src/env/serverEnvs";
const clientEnvPath = "./src/env/clientEnvs";

const { serverEnvs } = jiti(serverEnvPath);
jiti(clientEnvPath);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: serverEnvs.STANDALONE === 1 ? "standalone" : undefined,
  reactStrictMode: true,
  serverExternalPackages: ["@node-rs/argon2"],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { hostname: "azxhasnfullerxp7.public.blob.vercel-storage.com" },
    ],
  },
  // Add the redirects configuration here
  async redirects() {
    return [
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "www.catmisha.com",
          },
        ],
        destination: "https://catmisha.com",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.catmisha.com",
          },
        ],
        destination: "https://catmisha.com/:path*",
        permanent: true,
      },
      {
        source: "/",
        has: [
          {
            type: "host",
            value: "v2.catmisha.com",
          },
        ],
        destination: "https://catmisha.com",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "v2.catmisha.com",
          },
        ],
        destination: "https://catmisha.com/:path*",
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.m?js$/,
      type: "javascript/auto",
      resolve: {
        fullySpecified: false,
      },
    });

    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
