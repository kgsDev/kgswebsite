export async function POST({ request }) {
  try {
    const body = await request.json();
    const { fileId, datasetId, name, email, institution, purpose } = body;

    // Validate required fields
    if (!name || !email || !institution || !purpose || !fileId || !datasetId) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const directusUrl = import.meta.env.PUBLIC_DIRECTUS_URL;
    
    if (!directusUrl) {
      console.error('DIRECTUS_URL not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log the download request to Directus first
    const logResponse = await fetch(`${directusUrl}/items/dataset_downloads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset: datasetId,
        file: fileId,
        name,
        email,
        institution,
        purpose,
        downloaded_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
      })
    });

    if (!logResponse.ok) {
      const errorData = await logResponse.json();
      console.error('Failed to log download:', errorData);
    }

    // Get file info
    const fileResponse = await fetch(`${directusUrl}/files/${fileId}`);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file information');
    }
    const fileData = await fileResponse.json();
    const file = fileData.data;

    // Create a one-time download token that expires
    // This token is generated when the user submits the form
    // and is only valid for a short time
    const tokenExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes from now
    const token = btoa(JSON.stringify({
      fileId,
      filename: file.filename_download,
      expires: tokenExpiry
    }));

    // Return a URL to YOUR download endpoint with the token
    const downloadUrl = `/api/directus/download-file?token=${token}`;

    return new Response(JSON.stringify({ 
      success: true,
      download_url: downloadUrl,
      filename: file.filename_download,
      expires_in: 300
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dataset download error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process download request',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}