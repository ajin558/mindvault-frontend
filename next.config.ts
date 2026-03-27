import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // 当你在前端请求 /api/chat 时
        source: '/api/:path*',
        // Vercel 会自动帮你把请求转发到阿里云的后端
        // ⚠️ 请把下面的 IP 换成你真实的阿里云公网 IP
        destination: 'http://47.93.151.189:8000/:path*', 
      },
    ]
  },
};

export default nextConfig;