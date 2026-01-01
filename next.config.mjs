/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  // Improve chunk loading reliability
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Optimize chunk splitting for better loading
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
      
      // In development, add retry logic for failed chunks
      if (dev) {
        config.output = {
          ...config.output,
          chunkLoadTimeout: 30000, // 30 seconds timeout
        };
      }
    }
    return config;
  },
};

export default nextConfig;
