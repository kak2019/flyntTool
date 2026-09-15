/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@imgly/background-removal", "onnxruntime-web"],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
