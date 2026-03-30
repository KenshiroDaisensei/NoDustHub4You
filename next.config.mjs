// Allow fetching from APIs with self-signed/untrusted certificates (กรมอนามัย API)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
