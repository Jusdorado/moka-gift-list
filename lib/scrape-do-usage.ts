// Fetch usage stats from Scrape.do API
export async function getScrapeDoUsage(apiKey: string) {
  try {
    const res = await fetch('https://api.scrape.do/account/usage', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Scrape.do API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    
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

    return null;
  } catch (error) {
    console.error('Failed to fetch Scrape.do usage:', error);
    return null;
  }
}
