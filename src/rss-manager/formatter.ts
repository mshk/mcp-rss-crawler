import dbManager from '../db-manager';
import type { FeedItem, FeedResponse } from './types';

/**
 * Convert database items to feed items format
 */
export function convertDbItemsToFeedItems(dbItems: any[]): FeedItem[] {
  return dbItems.map(item => {
    // Get categories for this item
    const categories = dbManager.getItemCategories(item.id);
    
    return {
      id: item.id,
      title: item.title,
      published: item.published,
      updated: item.updated,
      summary: {
        direction: 'ltr',
        content: item.summary
      },
      author: item.author,
      categories,
      origin: {
        streamId: item.feed_id,
        title: '', // This will be filled in later if needed
        htmlUrl: ''
      },
      alternate: [{
        href: item.link,
        type: 'text/html'
      }]
    };
  });
}

/**
 * Format feed items into a feed response
 */
export function formatFeedResponse(items: FeedItem[], title: string, id: string, description: string): FeedResponse {
  return {
    direction: "ltr",
    id,
    title,
    description,
    self: {
      href: "/api/feeds"
    },
    updated: Math.floor(Date.now() / 1000),
    updatedUsec: Date.now().toString() + "000",
    items
  };
}
