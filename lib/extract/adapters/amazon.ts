import type { CheerioAPI } from 'cheerio';

export type AdapterResult = {
  name?: string | null;
  price?: string | null;
  image?: string | null;
};

export function extractAmazon($: CheerioAPI): AdapterResult {
  const result: AdapterResult = {};

  const title = $('#productTitle').first().text().trim();
  if (title) result.name = title;

  const whole = $('.a-price .a-price-whole').first().text().trim().replace(/[^\d]/g, '');
  const frac = $('.a-price .a-price-fraction').first().text().trim().replace(/[^\d]/g, '');
  if (whole) {
    result.price = frac ? `${whole},${frac}` : whole;
  } else {
    const offscreen = $('.a-price .a-offscreen').first().text().trim();
    if (offscreen) result.price = offscreen;
  }

  const landing = $('#landingImage').attr('src');
  if (landing) result.image = landing;

  return result;
}
