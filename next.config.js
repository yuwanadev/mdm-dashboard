/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/:path*`,
      },
      {
        source: '/screenshots/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8080'}/screenshots/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
