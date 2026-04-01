/** @type {import('next').Config} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'exceljs'],
  },
}

export default nextConfig
