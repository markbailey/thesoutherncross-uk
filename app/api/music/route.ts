import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const musicDir = path.join(process.cwd(), 'public', 'music');
  let files: string[] = [];
  
  try {
    if (fs.existsSync(musicDir)) {
      files = fs.readdirSync(musicDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.ogg', '.wav', '.flac', '.m4a'].includes(ext);
      });
    }
  } catch (error) {
    console.error('Error reading music directory:', error);
    return NextResponse.json({ error: 'Failed to read music directory' }, { status: 500 });
  }

  // Construct absolute URLs if host is available
  const host = request.headers.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const baseUrl = host ? `${protocol}://${host}` : '';

  const playlist = files.map(file => ({
    name: file,
    url: `${baseUrl}/music/${file}`
  }));

  return NextResponse.json(playlist);
}
