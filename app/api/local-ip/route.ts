import { NextResponse } from 'next/server';
import { networkInterfaces } from 'os';

export async function GET() {
  try {
    const nets = networkInterfaces();
    const results: string[] = [];

    for (const name of Object.keys(nets)) {
      const netInfo = nets[name];
      if (!netInfo) continue;

      for (const net of netInfo) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
        if (net.family === familyV4Value && !net.internal) {
          results.push(net.address);
        }
      }
    }

    // Return the first local IP found, or localhost as fallback
    return NextResponse.json({ 
      ip: results[0] || 'localhost',
      allIPs: results 
    });
  } catch (error) {
    return NextResponse.json({ 
      ip: 'localhost',
      allIPs: [],
      error: 'Failed to get local IP' 
    });
  }
}
