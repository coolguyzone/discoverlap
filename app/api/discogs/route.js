export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const per_page = searchParams.get('per_page') || '100';
  const page = searchParams.get('page') || '1';
  if (!username) {
    return new Response(JSON.stringify({ error: 'Missing username' }), { status: 400 });
  }
  const discogsUrl = `https://api.discogs.com/users/${username}/collection/folders/0/releases?per_page=${per_page}&page=${page}`;
  try {
    console.log('Fetching from Discogs:', discogsUrl);
    const res = await fetch(discogsUrl);
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      const text = await res.text();
      console.log('Non-JSON response from Discogs:', text);
      return new Response(JSON.stringify({ error: 'Non-JSON response from Discogs', text }), { status: res.status, headers: { 'Content-Type': 'application/json' } });
    }
    console.log('Discogs returned releases:', Array.isArray(data.releases) ? data.releases.length : 'no releases array');
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Discogs API error', details: data }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch from Discogs', details: err.message }), { status: 500 });
  }
} 