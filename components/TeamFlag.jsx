import Image from 'next/image';
import { flagUrl } from '@/lib/data';

export default function TeamFlag({ name, size = 24 }) {
  const url = flagUrl(name);
  if (!url) return null;
  return (
    <Image
      src={url}
      alt={name}
      width={Math.round(size * 4 / 3)}
      height={size}
      style={{ borderRadius: 3, flexShrink: 0, objectFit: 'cover' }}
      unoptimized
    />
  );
}
