import type { MetadataRoute } from 'next';
import { BUILD_DATE, SITE } from '../config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(BUILD_DATE),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
