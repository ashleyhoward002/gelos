/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: Static export (output: 'export') is NOT compatible with Server Actions
  // Gelos uses Server Actions extensively, so we use Capacitor's server URL mode
  // The native app will connect to the hosted web server
  images: {
    unoptimized: true,
  },
  // Add domains for remote images if needed
  // images: { domains: ['your-supabase-url.supabase.co'] },
};

export default nextConfig;
