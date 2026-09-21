// Fetch usage stats from Scrape.do API
export async function getScrapeDoUsage(apiKey: string) {
  try {
    console.log('[Scrape.do] Fetching usage with key:', apiKey.substring(0, 8) + '...');
    const res = await fetch('https://api.scrape.do/account/usage', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Scrape.do] Response status:', res.status);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`Scrape.do API error: ${res.status}`, text);
      return null;
    }

    const data = await res.json();
    console.log('[Scrape.do] Response data:', data);
    
    // Scrape.do returns: { credits_used, credits_limit, requests_used, requests_limit }
    if (data.credits_limit && typeof data.credits_used === 'number') {
      const percentage = Math.round((data.credits_used / data.credits_limit) * 100);
      return {
        used: data.credits_used,
        limit: data.credits_limit,
        percentage,
        remaining: data.credits_limit - data.credits_used,
      };
    }

    console.warn('[Scrape.do] Invalid response format:', data);
    return null;
  } catch (error) {
    console.error('Failed to fetch Scrape.do usage:', error);
    return null;
  }
}
