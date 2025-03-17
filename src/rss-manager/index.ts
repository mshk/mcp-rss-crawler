import dbManager from '../db-manager';
import { parseRssFeed, type ParsedFeed } from './feed-parser';
import { convertDbItemsToFeedItems, formatFeedResponse } from './formatter';
import { defaultRssFeeds } from '../../config';
import type { RssFeed, FeedResponse, FeedItem } from './types';
import FirecrawlApp from '@mendable/firecrawl-js';
import crypto from 'crypto';

/**
 * RSS Manager class to handle RSS feed operations
 */
export class RssManager {
  private cachedFeedItems: Map<string, FeedItem[]> = new Map();
  private lastFetchTime: number = 0;
  private initialized: boolean = false;
  private firecrawl: FirecrawlApp;

  constructor() {
    // Initialize with default feeds if needed
    this.initializeFeeds();
    // Initialize firecrawl with API key from environment variables
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      console.warn('FIRECRAWL_API_KEY not found in environment variables. Article fetching may not work correctly.');
    }
    this.firecrawl = new FirecrawlApp({ apiKey });
  }

  /**
   * Initialize feeds in the database with default feeds if needed
   */
  private async initializeFeeds(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get all feeds from the database
      const feeds = dbManager.getAllFeeds();
      
      // If no feeds exist, add the default feeds
      if (feeds.length === 0) {
        for (const feed of defaultRssFeeds) {
          dbManager.addFeed(feed.url, feed.name, feed.category);
        }
        console.error('Initialized database with default RSS feeds');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing feeds:', error);
    }
  }

  /**
   * Add a new RSS feed to the database
   */
  public addFeed(feed: RssFeed): boolean {
    return dbManager.addFeed(feed.url, feed.name, feed.category);
  }

  /**
   * Remove an RSS feed from the database
   */
  public removeFeed(url: string): boolean {
    return dbManager.removeFeed(url);
  }

  /**
   * Get the list of RSS feeds from the database
   */
  public getFeeds(): RssFeed[] {
    const feeds = dbManager.getAllFeeds();
    return feeds.map(feed => ({
      url: feed.url,
      name: feed.name,
      category: feed.category || undefined
    }));
  }

  /**
   * Add a new interest keyword to the database
   */
  public addKeyword(keyword: string): boolean {
    return dbManager.addKeyword(keyword);
  }

  /**
   * Remove an interest keyword from the database
   */
  public removeKeyword(keyword: string): boolean {
    return dbManager.removeKeyword(keyword);
  }

  /**
   * Get all interest keywords from the database
   */
  public getKeywords(): string[] {
    const keywords = dbManager.getAllKeywords();
    return keywords.map(k => k.keyword);
  }

  /**
   * Get articles matching the user's interest keywords
   */
  public async getArticlesByKeywords(limit: number = 10): Promise<FeedResponse> {
    try {
      // Get items matching keywords from the database
      const items = dbManager.getItemsByKeywords(limit);
      
      // Convert to feed items
      const feedItems = convertDbItemsToFeedItems(items);
      
      // Return formatted response
      return formatFeedResponse(
        feedItems,
        "Articles Matching Your Interests",
        "feed/interests",
        "Articles matching your interest keywords"
      );
    } catch (error) {
      console.error('Error getting articles by keywords:', error);
      return formatFeedResponse([], "Error", "error", "Error getting articles by keywords");
    }
  }

  /**
   * Fetch an article from a URL using firecrawl and save it to the database
   * @param url The URL to fetch the article from
   * @returns The fetched article or null if there was an error
   */
  public async fetchArticleFromUrl(url: string): Promise<any> {
    try {
      console.error(`Fetching article from URL: ${url}`);
      
      // Check if the article already exists in the database
      const existingArticle = dbManager.getArticleByUrl(url);
      if (existingArticle) {
        console.error(`Article already exists in database: ${url}`);
        return existingArticle;
      }
      
      // Use firecrawl to fetch the article - using the exact pattern from the example code
      const scrapeResult = await this.firecrawl.scrapeUrl(url, { 
        formats: ['markdown', 'html']
      });
      
      if (!scrapeResult.success) {
        console.error(`Failed to scrape URL: ${url} - ${scrapeResult.error}`);
        return null;
      }
      
      // Generate a unique ID for the article
      const id = `article/${crypto.createHash('md5').update(url).digest('hex')}`;
      
      // Extract data from the scrapeResult, handling potential missing fields
      const resultData = scrapeResult as any; // Cast to any to access potential properties
      
      // Save the article to the database
      const article = {
        id,
        url,
        title: resultData.title || '',
        content: resultData.markdown || '',
        html: resultData.html || '',
        author: resultData.author || '',
        published_date: resultData.publishedDate || '',
        image_url: resultData.imageUrl || '',
        summary: resultData.description || '',
        fetched_at: Date.now()
      };
      
      const saved = dbManager.saveArticle(article);
      if (!saved) {
        console.error(`Failed to save article to database: ${url}`);
        return null;
      }
      
      console.error(`Successfully fetched and saved article: ${url}`);
      return article;
    } catch (error) {
      console.error(`Error fetching article from URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Get articles from the database
   * @param limit Maximum number of articles to return
   * @returns Array of articles
   */
  public getArticles(limit: number = 10): any[] {
    try {
      console.error(`Getting articles with limit: ${limit}`);
      return dbManager.getAllArticles(limit);
    } catch (error) {
      console.error(`Error getting articles: ${error}`);
      return [];
    }
  }

  /**
   * Search articles in the database
   * @param query Search query
   * @param limit Maximum number of articles to return
   * @returns Array of matching articles
   */
  public searchArticles(query: string, limit: number = 10): any[] {
    try {
      console.error(`Searching articles with query: ${query}, limit: ${limit}`);
      return dbManager.searchArticles(query, limit);
    } catch (error) {
      console.error(`Error searching articles: ${error}`);
      return [];
    }
  }

  /**
   * Fetch articles from all RSS feeds and store in SQLite
   */
  public async fetchFeeds(limit: number = 10): Promise<FeedResponse> {
    try {
      // Collect items from all feeds
      const allItems: FeedItem[] = [];
      
      // Get all feeds from the database
      const feeds = this.getFeeds();
      
      // Process feeds in parallel
      const feedPromises = feeds.map(feed => 
        this.fetchFeed(feed.url, feed.name, feed.category)
          .then(items => {
            // Add items to the collection
            if (items && items.length > 0) {
              allItems.push(...items);
              
              // Cache the items for this feed
              this.cachedFeedItems.set(feed.url, items);
            }
          })
          .catch(error => {
            console.error(`Error fetching feed ${feed.url}:`, error);
          })
      );
      
      // Wait for all feeds to be processed
      await Promise.all(feedPromises);
      
      // Sort all items by published date (newest first)
      allItems.sort((a, b) => (b.published || 0) - (a.published || 0));
      
      // Update last fetch time
      this.lastFetchTime = Date.now();
      
      // Return formatted response with limited items
      return formatFeedResponse(
        allItems.slice(0, limit),
        "RSS Manager Feeds",
        "feed/all",
        "Aggregated feeds from RSS Manager"
      );
    } catch (error) {
      console.error('Error fetching feeds:', error);
      return formatFeedResponse([], "Error", "error", "Error fetching feeds");
    }
  }
  
  /**
   * Fetch a single RSS feed and store in SQLite
   */
  private async fetchFeed(feedUrl: string, feedName: string, category?: string): Promise<FeedItem[]> {
    try {
      // Parse the RSS feed
      const parsedFeed: ParsedFeed = await parseRssFeed(feedUrl);
      
      if (!parsedFeed || !parsedFeed.items || parsedFeed.items.length === 0) {
        console.warn(`No items found in feed: ${feedUrl}`);
        return [];
      }
      
      // Use the feed title from the parsed feed if available, otherwise use the provided name
      const title = feedName || parsedFeed.title || 'Unknown Feed';
      
      // Save the feed and its items to the database
      dbManager.saveFeed(
        feedUrl,
        title,
        category,
        parsedFeed.items
      );
      
      return parsedFeed.items;
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error);
      return [];
    }
  }
  
  /**
   * Get the latest feeds from the database
   */
  public async getLatestArticles(limit: number = 10): Promise<FeedResponse> {
    try {
      // Get items from the database
      const items = dbManager.getItems(limit);
      
      // Convert to feed items
      const feedItems = convertDbItemsToFeedItems(items);
      
      // Return formatted response
      return formatFeedResponse(
        feedItems,
        "Latest RSS Feeds",
        "feed/latest",
        "Latest articles from RSS feeds"
      );
    } catch (error) {
      console.error('Error getting latest feeds:', error);
      return formatFeedResponse([], "Error", "error", "Error getting latest feeds");
    }
  }
  
  /**
   * Get feeds by category from the database
   */
  public async getFeedsByCategory(category: string, limit: number = 10): Promise<FeedResponse> {
    try {
      // Get items by category from the database
      const items = dbManager.getItemsByCategory(category, limit);
      
      // Convert to feed items
      const feedItems = convertDbItemsToFeedItems(items);
      
      // Return formatted response
      return formatFeedResponse(
        feedItems,
        `${category} Feeds`,
        `category/${category}`,
        `Feeds from the ${category} category`
      );
    } catch (error) {
      console.error(`Error getting feeds by category ${category}:`, error);
      return formatFeedResponse([], "Error", "error", `Error getting feeds for category: ${category}`);
    }
  }
  
  /**
   * Search feeds in the database
   */
  public async searchFeeds(query: string, limit: number = 10): Promise<FeedResponse> {
    try {
      // Search items in the database
      const items = dbManager.searchItems(query, limit);
      
      // Convert to feed items
      const feedItems = convertDbItemsToFeedItems(items);
      
      // Return formatted response
      return formatFeedResponse(
        feedItems,
        `Search Results for "${query}"`,
        `search/${query}`,
        `Search results for "${query}"`
      );
    } catch (error) {
      console.error(`Error searching feeds for ${query}:`, error);
      return formatFeedResponse([], "Error", "error", `Error searching feeds for: ${query}`);
    }
  }
}

// Create and export an instance of the RSS manager
const rssManager = new RssManager();

export default rssManager;
