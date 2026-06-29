/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Allow Server Actions (login, booking, admin forms) when the app is
      // served through a proxied dev URL — e.g. GitHub Codespaces forwards
      // port 3000 to "https://<name>-3000.app.github.dev". Without this,
      // Next.js's CSRF check rejects the request as
      // "Invalid Server Actions request" because the forwarded Origin doesn't
      // match the server Host. Safe to keep for local + Codespaces dev.
      allowedOrigins: [
        "localhost:3000",
        "*.app.github.dev",
        "*.githubpreview.dev",
      ],
    },
  },
};

export default nextConfig;
