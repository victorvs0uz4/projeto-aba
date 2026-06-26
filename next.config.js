/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  // Permite acesso ao servidor de dev de outras origens na rede local (VM / acesso remoto)
  allowedDevOrigins: [
    '172.16.0.0/12',   // range de IPs privados (VMs locais)
    '192.168.0.0/16',  // range de IPs de rede local
    '10.0.0.0/8',      // range corporativo
    'localhost',
  ],
};

module.exports = nextConfig;
