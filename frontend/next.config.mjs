/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Only apply special handling for the client-side bundle
    if (!isServer) {
      // Exclude @xenova/transformers from webpack bundling
      // This is important because we're loading it from CDN with UMD format
      config.externals = [
        ...(config.externals || []),
        {
          '@xenova/transformers': 'globalThis.transformers'
        }
      ];
      
      // Configure for onnxruntime-web
      // Copy WASM files to the static directory
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        os: false,
        util: false,
        stream: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
        assert: false,
        buffer: false,
        querystring: false,
        child_process: false,
      };
      
      // Add rule for WASM files
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/wasm/[name][ext]'
        }
      });
      
      // Handle ONNX files
      config.module.rules.push({
        test: /\.onnx$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/onnx/[name][ext]'
        }
      });
    }
    
    return config;
  },
  // Disable transpilation since we're using the CDN version
  transpilePackages: [],
  reactStrictMode: true,
  // Set proper output paths for WASM files
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        'node_modules/webpack',
      ],
    },
  },
  // Add support for WebAssembly
  // Needed for onnxruntime-web
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig; 