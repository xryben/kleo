/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => `build-${Date.now()}`,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
