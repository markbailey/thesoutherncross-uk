import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const musicDir = path.join(process.cwd(), 'public', 'music');
  let files: string[] = [];
  
  try {
    if (fs.existsSync(musicDir)) {
      const allEntries = fs.readdirSync(musicDir, { recursive: true });
      files = allEntries.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.ogg', '.wav', '.flac', '.m4a'].includes(ext);
      });
    }
  } catch (error) {
    console.error('Error reading music directory:', error);
    return NextResponse.json({ error: 'Failed to read music directory' }, { status: 500 });
  }

  // Construct absolute URLs if host is available
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = host ? `${protocol}://${host}` : '';

  const playlist = files.map(file => {
    // Ensure URL has forward slashes, even on Windows
    const urlPath = file.replace(/\\/g, '/');
    return {
      name: urlPath,
      url: `${baseUrl}/music/${urlPath}`
    };
  });

  return NextResponse.json(playlist);
}
