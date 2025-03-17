import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Database file path
const DB_DIR = process.env.DB_DIR || path.join(os.homedir(), '.mcp-rss-crawler');
const DB_FILE = process.env.DB_FILE || path.join(DB_DIR, 'feeds.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_FILE);

/**
 * Initialize the database and create tables if they don't exist
 */
function initializeDatabase(): void {
  // Create feeds table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      last_updated INTEGER
    )
  `);
  
  // Create items table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      feed_id TEXT NOT NULL,
      title TEXT NOT NULL,
      link TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      published INTEGER,
      author TEXT,
      FOREIGN KEY (feed_id) REFERENCES feeds(id)
    )
  `);
  
  // Create categories table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      item_id TEXT NOT NULL,
      category TEXT NOT NULL,
      PRIMARY KEY (item_id, category),
      FOREIGN KEY (item_id) REFERENCES items(id)
    )
  `);
  
  // Create keywords table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS keywords (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  
  // Create articles table for firecrawl content if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      content TEXT,
      html TEXT,
      author TEXT,
      published_date TEXT,
      image_url TEXT,
      summary TEXT,
      fetched_at INTEGER NOT NULL,
      UNIQUE(url)
    )
  `);
  
  // Prepare statements
  prepareStatements();
}

// Prepare statements
let insertFeedStmt: any;
let insertItemStmt: any;
let insertCategoryStmt: any;
let getItemsStmt: any;
let getItemsByCategoryStmt: any;
let searchItemsStmt: any;
let getItemCategoriesStmt: any;
let deleteOldItemsStmt: any;
let getAllFeedsStmt: any;
let getFeedByUrlStmt: any;
let deleteFeedStmt: any;
let getAllKeywordsStmt: any;
let addKeywordStmt: any;
let removeKeywordStmt: any;
let addArticleStmt: any;
let getArticleByUrlStmt: any;
let getAllArticlesStmt: any;
let searchArticlesStmt: any;

function prepareStatements(): void {
  // Prepare statements for feeds table
  insertFeedStmt = db.prepare(`
    INSERT OR REPLACE INTO feeds (id, url, name, category, last_updated)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  getFeedByUrlStmt = db.prepare(`
    SELECT * FROM feeds WHERE url = ?
  `);
  
  getAllFeedsStmt = db.prepare(`
    SELECT * FROM feeds ORDER BY category, name
  `);
  
  deleteFeedStmt = db.prepare(`
    DELETE FROM feeds WHERE url = ?
  `);
  
  // Prepare statements for items table
  insertItemStmt = db.prepare(`
    INSERT OR REPLACE INTO items (id, feed_id, title, link, summary, content, published, author)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  getItemsStmt = db.prepare(`
    SELECT i.*, f.name as feed_title, f.url as feed_url
    FROM items i
    JOIN feeds f ON i.feed_id = f.id
    ORDER BY i.published DESC
    LIMIT ?
  `);
  
  getItemsByCategoryStmt = db.prepare(`
    SELECT i.*, f.name as feed_title, f.url as feed_url
    FROM items i
    JOIN feeds f ON i.feed_id = f.id
    WHERE f.category = ?
    ORDER BY i.published DESC
    LIMIT ?
  `);
  
  searchItemsStmt = db.prepare(`
    SELECT i.*, f.name as feed_title, f.url as feed_url
    FROM items i
    JOIN feeds f ON i.feed_id = f.id
    WHERE i.title LIKE '%' || ? || '%' OR i.summary LIKE '%' || ? || '%' OR i.content LIKE '%' || ? || '%'
    ORDER BY i.published DESC
    LIMIT ?
  `);
  
  getItemCategoriesStmt = db.prepare(`
    SELECT category
    FROM categories
    WHERE item_id = ?
  `);
  
  deleteOldItemsStmt = db.prepare(`
    DELETE FROM items
    WHERE published < ?
  `);
  
  // Prepare statements for categories
  insertCategoryStmt = db.prepare(`
    INSERT OR REPLACE INTO categories (item_id, category)
    VALUES (?, ?)
  `);
  
  // Prepare statements for keywords table
  getAllKeywordsStmt = db.prepare(`
    SELECT * FROM keywords ORDER BY created_at DESC
  `);
  
  addKeywordStmt = db.prepare(`
    INSERT INTO keywords (id, keyword, created_at)
    VALUES (?, ?, ?)
  `);
  
  removeKeywordStmt = db.prepare(`
    DELETE FROM keywords WHERE keyword = ?
  `);
  
  // Prepare statements for articles table
  addArticleStmt = db.prepare(`
    INSERT OR REPLACE INTO articles (
      id, url, title, content, html, author, published_date, 
      image_url, summary, fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  getArticleByUrlStmt = db.prepare(`
    SELECT * FROM articles WHERE url = ?
  `);
  
  getAllArticlesStmt = db.prepare(`
    SELECT * FROM articles ORDER BY fetched_at DESC LIMIT ?
  `);
  
  searchArticlesStmt = db.prepare(`
    SELECT * FROM articles 
    WHERE title LIKE '%' || ? || '%' OR content LIKE '%' || ? || '%' 
    ORDER BY fetched_at DESC LIMIT ?
  `);
}

/**
 * Insert an item with its categories
 */
function insertItem(item: any, feedId: string): void {
  // Begin transaction
  db.transaction(() => {
    // Convert date string to timestamp if needed
    const publishedTime = typeof item.published === 'string' 
      ? new Date(item.published).getTime() / 1000 
      : Math.floor(item.published || Date.now() / 1000);
    
    // Get summary content
    const summary = typeof item.summary === 'string' 
      ? item.summary 
      : item.summary?.value || '';
    
    // Get content
    const content = typeof item.content === 'string'
      ? item.content
      : item.content?.value || '';
    
    // Get link
    const link = typeof item.link === 'string'
      ? item.link
      : item.link?.href || '';
    
    // Insert the item
    insertItemStmt.run(
      item.id,
      feedId,
      item.title || 'Untitled',
      link,
      summary,
      content,
      publishedTime,
      item.author || ''
    );

    // Insert categories
    if (item.categories && Array.isArray(item.categories)) {
      for (const category of item.categories) {
        if (category) {
          insertCategoryStmt.run(item.id, category);
        }
      }
    }
  })();
}

/**
 * Save a feed and its items to the database
 */
function saveFeed(feedUrl: string, feedName: string, category: string | undefined, items: any[]): number {
  // Generate a feed ID
  const feedId = `feed/${Buffer.from(feedUrl).toString('base64').substring(0, 20)}`;
  
  // Insert the feed
  db.prepare(`
    INSERT OR REPLACE INTO feeds (id, url, name, category, last_updated)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    feedId,
    feedUrl,
    feedName,
    category || null,
    Date.now()
  );
  
  // Insert each item
  for (const item of items) {
    insertItem(item, feedId);
  }
  
  return items.length;
}

/**
 * Get items from the database
 */
function getItems(limit: number = 10): any[] {
  return getItemsStmt.all(limit) as any[];
}

/**
 * Get items by category
 */
function getItemsByCategory(category: string, limit: number = 10): any[] {
  return getItemsByCategoryStmt.all(category, limit) as any[];
}

/**
 * Search items
 */
function searchItems(query: string, limit: number = 10): any[] {
  const searchPattern = `%${query}%`;
  return searchItemsStmt.all(searchPattern, searchPattern, searchPattern, limit) as any[];
}

/**
 * Get categories for an item
 */
function getItemCategories(itemId: string): string[] {
  const rows = getItemCategoriesStmt.all(itemId) as any[];
  return rows.map(row => row.category);
}

/**
 * Delete old items (older than the specified timestamp)
 */
function deleteOldItems(timestamp: number): void {
  deleteOldItemsStmt.run(timestamp);
}

/**
 * Get all feeds from the database
 */
function getAllFeeds(): any[] {
  return getAllFeedsStmt.all() as any[];
}

/**
 * Get a feed by URL
 */
function getFeedByUrl(url: string): any {
  return getFeedByUrlStmt.get(url);
}

/**
 * Add a feed to the database
 */
function addFeed(url: string, name: string, category?: string): boolean {
  try {
    // Check if the feed already exists
    const existingFeed = getFeedByUrl(url);
    if (existingFeed) {
      // Update the feed if it exists
      const feedId = existingFeed.id;
      db.prepare(`
        INSERT OR REPLACE INTO feeds (id, url, name, category, last_updated)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        feedId,
        url,
        name,
        category || null,
        Date.now()
      );
    } else {
      // Generate a unique ID for the feed
      const feedId = `feed/${Buffer.from(url).toString('base64').substring(0, 20)}`;
      
      // Insert the feed
      db.prepare(`
        INSERT OR REPLACE INTO feeds (id, url, name, category, last_updated)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        feedId,
        url,
        name,
        category || null,
        Date.now()
      );
    }
    return true;
  } catch (error) {
    console.error('Error adding feed:', error);
    return false;
  }
}

/**
 * Remove a feed from the database
 */
function removeFeed(url: string): boolean {
  try {
    // Delete the feed
    deleteFeedStmt.run(url);
    return true;
  } catch (error) {
    console.error('Error removing feed:', error);
    return false;
  }
}

/**
 * Get all keywords from the database
 */
function getAllKeywords(): any[] {
  return getAllKeywordsStmt.all() as any[];
}

/**
 * Add a new keyword to the database
 */
function addKeyword(keyword: string): boolean {
  try {
    // Check if the keyword already exists
    const existingKeyword = db.prepare(`
      SELECT * FROM keywords WHERE keyword = ?
    `).get(keyword);
    
    if (existingKeyword) {
      console.error(`Keyword "${keyword}" already exists`);
      return false;
    }
    
    // Add the keyword
    const id = `keyword_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const createdAt = Math.floor(Date.now() / 1000);
    
    addKeywordStmt.run(id, keyword, createdAt);
    
    console.error(`Added keyword: ${keyword}`);
    return true;
  } catch (error) {
    console.error(`Error adding keyword: ${error}`);
    return false;
  }
}

/**
 * Remove a keyword from the database
 */
function removeKeyword(keyword: string): boolean {
  try {
    // Check if the keyword exists
    const existingKeyword = db.prepare(`
      SELECT * FROM keywords WHERE keyword = ?
    `).get(keyword);
    
    if (!existingKeyword) {
      console.error(`Keyword "${keyword}" not found`);
      return false;
    }
    
    // Remove the keyword
    removeKeywordStmt.run(keyword);
    
    console.error(`Removed keyword: ${keyword}`);
    return true;
  } catch (error) {
    console.error(`Error removing keyword: ${error}`);
    return false;
  }
}

/**
 * Search for items matching any of the user's interest keywords
 */
function getItemsByKeywords(limit: number = 10): any[] {
  try {
    // Get all keywords
    const keywords = getAllKeywords();
    
    if (!keywords || keywords.length === 0) {
      return [];
    }
    
    // Build the SQL query with OR conditions for each keyword
    const keywordValues = keywords.map(k => k.keyword);
    
    const query = `
      SELECT i.* FROM items i
      WHERE i.title LIKE '%' || ? || '%' OR i.summary LIKE '%' || ? || '%'
      ORDER BY i.published DESC
      LIMIT ?
    `;
    
    // Prepare the statement with all keywords
    let items: any[] = [];
    
    // Execute a query for each keyword and combine results
    for (const keyword of keywordValues) {
      const results = db.prepare(query).all(keyword, keyword, limit) as any[];
      
      // Add items that aren't already in the results
      for (const item of results) {
        if (!items.some(i => i.id === item.id)) {
          items.push(item);
        }
        
        // Stop if we've reached the limit
        if (items.length >= limit) {
          break;
        }
      }
      
      // Stop if we've reached the limit
      if (items.length >= limit) {
        break;
      }
    }
    
    // Sort by published date and limit
    items.sort((a, b) => b.published - a.published);
    return items.slice(0, limit);
  } catch (error) {
    console.error(`Error getting items by keywords: ${error}`);
    return [];
  }
}

/**
 * Add or update an article in the database
 */
function saveArticle(article: {
  id: string;
  url: string;
  title?: string;
  content?: string;
  html?: string;
  author?: string;
  published_date?: string;
  image_url?: string;
  summary?: string;
}): boolean {
  try {
    addArticleStmt.run(
      article.id,
      article.url,
      article.title || null,
      article.content || null,
      article.html || null,
      article.author || null,
      article.published_date || null,
      article.image_url || null,
      article.summary || null,
      Date.now()
    );
    return true;
  } catch (error) {
    console.error(`Error saving article: ${error}`);
    return false;
  }
}

/**
 * Get an article by URL
 */
function getArticleByUrl(url: string): any {
  try {
    return getArticleByUrlStmt.get(url);
  } catch (error) {
    console.error(`Error getting article by URL: ${error}`);
    return null;
  }
}

/**
 * Get all articles with limit
 */
function getAllArticles(limit: number = 50): any[] {
  try {
    return getAllArticlesStmt.all(limit) as any[];
  } catch (error) {
    console.error(`Error getting all articles: ${error}`);
    return [];
  }
}

/**
 * Search articles by query
 */
function searchArticles(query: string, limit: number = 50): any[] {
  try {
    return searchArticlesStmt.all(query, query, limit) as any[];
  } catch (error) {
    console.error(`Error searching articles: ${error}`);
    return [];
  }
}

/**
 * Close the database connection
 */
function closeDatabase(): void {
  db.close();
}

// Export database functions
export default {
  initializeDatabase,
  addFeed,
  removeFeed,
  getAllFeeds,
  getFeedByUrl,
  saveFeed,
  getItems,
  getItemsByCategory,
  searchItems,
  getItemCategories,
  deleteOldItems,
  getAllKeywords,
  addKeyword,
  removeKeyword,
  getItemsByKeywords,
  saveArticle,
  getArticleByUrl,
  getAllArticles,
  searchArticles,
  closeDatabase
};

// Initialize the database
initializeDatabase();
