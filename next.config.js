/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let remotePatterns = [];
try {
  if (supabaseUrl) {
    const host = new URL(supabaseUrl).host;
    remotePatterns = [
      { protocol: 'https', hostname: host },
    ];
  }
} catch (e) {
  // ignore invalid env URL
}

const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'njxsuqvqaeesxmoajzyb.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
        ],
    },
};

module.exports = nextConfig;