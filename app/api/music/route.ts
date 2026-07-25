import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getAudioFilesRecursive(dir: string, fileList: string[] = [], basePath: string = dir): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAudioFilesRecursive(filePath, fileList, basePath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.mp3', '.ogg', '.wav', '.flac', '.m4a'].includes(ext)) {
        fileList.push(path.relative(basePath, filePath));
      }
    }
  }
  return fileList;
}

export async function GET(request: Request) {
  const musicDir = path.join(process.cwd(), 'public', 'music');
  let files: string[] = [];
  
  try {
    files = getAudioFilesRecursive(musicDir);
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
