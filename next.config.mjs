/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  images: {
    remotePatterns: [{ hostname: "cdn.discordapp.com" }],
  },
};

export default nextConfig;
