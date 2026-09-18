/** @type {import('next').NextConfig} */
// Keep per-user attendance pages fresh when navigating with the App Router.
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
