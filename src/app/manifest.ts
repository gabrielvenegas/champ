import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EA FC Friends Championship',
    short_name: 'FC Champ',
    description: 'Manage EA FC round-robin tournaments with your friends',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0e14',
    theme_color: '#00ff66',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
