/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@imgly/background-removal", "onnxruntime-web"],
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    // instrumentation 会同时打进 Edge。那边解析不了 node:fs，盯价只在 Node 进程里跑。
    if (nextRuntime === "edge" || !isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/hotel-watch(?!-stub)(\.ts)?$/, (resource) => {
          resource.request = resource.request.replace(/hotel-watch(\.ts)?$/, "hotel-watch-stub.ts");
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
