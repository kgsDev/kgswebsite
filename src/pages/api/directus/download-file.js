export async function GET({ url }) {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response('Missing download token', { status: 400 });
    }

    // Decode and validate the token
    let tokenData;
    try {
      tokenData = JSON.parse(atob(token));
    } catch {
      return new Response('Invalid token', { status: 400 });
    }

    // Check if token has expired
    if (Date.now() > tokenData.expires) {
      return new Response('Download link has expired. Please request a new download.', { 
        status: 410 
      });
    }

    const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL;
    const { fileId, filename } = tokenData;

    // Fetch the file from Directus
    const fileResponse = await fetch(`${directusUrl}/assets/${fileId}/${filename}`);
    
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file');
    }

    // Stream the file to the user
    return new Response(fileResponse.body, {
      status: 200,
      headers: {
        'Content-Type': fileResponse.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileResponse.headers.get('Content-Length') || '',
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    return new Response('Failed to download file', { status: 500 });
  }
}