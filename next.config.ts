import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Redirection permanente (308) de l'ancien domaine Vercel vers le domaine
     canonique preconia.fr — préserve le SEO et évite le contenu dupliqué. */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "preconia.vercel.app" }],
        destination: "https://preconia.fr/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
