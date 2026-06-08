/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Product images come from many Kapruka CDN hosts; we render them with a plain
  // <img> tag (see components/Cards.tsx) so no remotePatterns allow-list is needed.
};

export default nextConfig;
