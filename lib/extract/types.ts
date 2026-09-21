export type Confidence = 'high' | 'medium' | 'low';

export type FieldResult<T> = {
  value: T | null;
  source: string;
  confidence: Confidence;
};

export type ExtractionStatus =
  | 'ok'
  | 'partial'
  | 'blocked'
  | 'not_found'
  | 'fetch_failed';

export type Currency = 'EUR' | 'USD' | 'GBP';

export type ProductExtraction = {
  name: string | null;
  price: string | null;
  image: string | null;
  currency: Currency | null;
  priceAmount: number | null;
  fields: {
    name: FieldResult<string>;
    price: FieldResult<string>;
    image: FieldResult<string>;
  };
  status: ExtractionStatus;
  warnings: string[];
};
