// Define the type for RSS feed entries
export interface RssFeed {
  url: string;
  name: string;
  category?: string;
}

// Define the type for feed items
export interface FeedItem {
  id: string;
  title: string;
  published: number;
  updated: number;
  summary: {
    direction: string;
    content: string;
  };
  author?: string;
  categories: string[];
  origin: {
    streamId: string;
    title: string;
    htmlUrl: string;
  };
  canonical?: Array<{ href: string }>;
  alternate?: Array<{ href: string; type: string }>;
}

// Define the type for feed response
export interface FeedResponse {
  direction: string;
  id: string;
  title: string;
  description: string;
  self: {
    href: string;
  };
  updated: number;
  updatedUsec: string;
  items: FeedItem[];
  continuation?: string;
}
