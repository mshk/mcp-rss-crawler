import path from 'path';
import os from 'os';
import type { RssFeed } from './src/rss-manager/types';

// Database file path
export const DB_DIR = process.env.DB_DIR || path.join(os.homedir(), '.mcp-rss-crawler');
export const DB_FILE = process.env.DB_FILE || path.join(DB_DIR, 'feeds.db');

// List of default RSS feeds to monitor
export const defaultRssFeeds: RssFeed[] = [
  {
    url: 'https://feeds.arstechnica.com/arstechnica/gadgets',
    name: 'Ars Technica Gear & Gadgets',
    category: 'Tech'
  },
  {
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    name: 'New York Times Technology',
    category: 'Tech'
  },
  {
    url: 'https://feeds2.feedburner.com/businessinsider',
    name: 'Business Insider',
    category: 'Business'
  },
  {
    url: 'https://assets.wor.jp/rss/rdf/nikkei/news.rdf',
    name: 'Nikkei News',
    category: 'Business'
  },
  {
    url: 'https://media-innovation.jp/rss20/index.rdf',
    name: 'media-innovation.jp',
    category: 'Business'
  },
  {
    url: 'https://hackernews.cc/feed',
    name: 'HackerNews',
    category: 'Business'
  },
  {
    url: 'https://www.techmeme.com/index.xml',
    name: 'Techmeme',
    category: 'Business'
  },
  {
    url: 'https://techcrunch.com/feed/',
    name: 'TechCrunch',
    category: 'Business'
  },
  {
    url: 'https://www.theverge.com/rss/index.xml',
    name: 'The Verge',
    category: 'Business'
  },
  {
    url: 'https://kaden.watch.impress.co.jp/cda/rss/kaden.rdf',
    name: '家電 Watch',
    category: 'Business'
  },
  {
    url: 'https://akiba-pc.watch.impress.co.jp/cda/rss/akiba-pc.rdf',
    name: 'AKIBA PC Hotline!',
    category: 'Business'
  },
  {
    url: 'https://pc.watch.impress.co.jp/sublink/pc.rdf',
    name: 'PC Watch',
    category: 'Business'
  },
  {
    url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml',
    name: 'ITmedia News 速報 最新記事一覧',
    category: 'Business'
  },
  {
    url: 'https://rss.itmedia.co.jp/rss/1.0/topstory.xml',
    name: 'ITmedia TOP STORIES 最新記事一覧',
    category: 'Business'
  }
  // Add more feeds as needed
];
