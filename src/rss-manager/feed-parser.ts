import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import type { FeedItem } from './types';

/**
 * Interface for the parsed feed result
 */
export interface ParsedFeed {
  title: string;
  description?: string;
  link?: string;
  items: FeedItem[];
}

/**
 * Parse an RSS feed and convert it to the standard format
 */
export async function parseRssFeed(feedUrl: string): Promise<ParsedFeed> {
  try {
    // Fetch the RSS feed
    const response = await axios.get(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSSManager/1.0)'
      }
    });

    // Parse the XML
    const result = await parseStringPromise(response.data, {
      explicitArray: false,
      mergeAttrs: true
    });

    // Handle different RSS formats
    let channel;
    let items = [];
    let feedTitle = '';
    let feedDescription = '';
    let feedLink = '';

    // Regular RSS
    if (result.rss?.channel) {
      channel = result.rss.channel;
      items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
      feedTitle = channel.title || '';
      feedDescription = channel.description || '';
      feedLink = channel.link || '';
    } 
    // Atom
    else if (result.feed) {
      channel = result.feed;
      items = Array.isArray(channel.entry) ? channel.entry : channel.entry ? [channel.entry] : [];
      feedTitle = channel.title || '';
      feedDescription = channel.subtitle || '';
      feedLink = channel.link?.href || channel.link || '';
    } 
    // RDF
    else if (result.rdf?.channel) {
      channel = result.rdf.channel;
      items = Array.isArray(result.rdf.item) ? result.rdf.item : result.rdf.item ? [result.rdf.item] : [];
      feedTitle = channel.title || '';
      feedDescription = channel.description || '';
      feedLink = channel.link || '';
    }
    // Other formats
    else if (result['rdf:RDF']) {
      const rdf = result['rdf:RDF'];
      channel = rdf.channel || rdf['channel:channel'] || {};
      items = Array.isArray(rdf.item) ? rdf.item : rdf.item ? [rdf.item] : [];
      feedTitle = channel.title || '';
      feedDescription = channel.description || '';
      feedLink = channel.link || '';
    }
    
    if (!channel || items.length === 0) {
      console.error('Unsupported RSS format or no items found:', Object.keys(result));
      return { title: 'Unknown Feed', items: [] };
    }

    // Convert items to standard format
    const standardItems = items.map((item: any) => {
      // Get the title
      const title = item.title || '';
      
      // Get the published date
      let published = 0;
      if (item.pubDate) {
        published = Math.floor(new Date(item.pubDate).getTime() / 1000);
      } else if (item.published) {
        published = Math.floor(new Date(item.published).getTime() / 1000);
      } else if (item.updated) {
        published = Math.floor(new Date(item.updated).getTime() / 1000);
      } else if (item['dc:date']) {
        published = Math.floor(new Date(item['dc:date']).getTime() / 1000);
      } else {
        published = Math.floor(Date.now() / 1000);
      }
      
      // Get the updated date (default to published date)
      let updated = published;
      if (item.updated) {
        updated = Math.floor(new Date(item.updated).getTime() / 1000);
      }
      
      // Get the summary/content
      let summary = '';
      if (item.description) {
        summary = item.description;
      } else if (item.summary) {
        summary = item.summary;
      } else if (item.content) {
        summary = item.content;
      } else if (item['content:encoded']) {
        summary = item['content:encoded'];
      }
      
      // Get the author
      let author = '';
      if (item.author) {
        if (typeof item.author === 'string') {
          author = item.author;
        } else if (item.author.name) {
          author = item.author.name;
        }
      } else if (item['dc:creator']) {
        author = item['dc:creator'];
      }
      
      // Get the link
      let link = '';
      if (item.link) {
        if (typeof item.link === 'string') {
          link = item.link;
        } else if (item.link.href) {
          link = item.link.href;
        }
      }
      
      // Get the categories
      let categories: string[] = [];
      if (item.category) {
        if (typeof item.category === 'string') {
          categories = [item.category];
        } else if (Array.isArray(item.category)) {
          categories = item.category.map((cat: any) => 
            typeof cat === 'string' ? cat : cat._ || ''
          ).filter(Boolean);
        }
      }
      
      return {
        id: item.guid || item.id || `${feedUrl}/${title}`,
        title,
        published,
        updated,
        summary: {
          direction: 'ltr',
          content: summary
        },
        author,
        categories,
        origin: {
          streamId: `feed/${Buffer.from(feedUrl).toString('base64').substring(0, 20)}`,
          title: feedTitle,
          htmlUrl: feedLink
        },
        alternate: [{
          href: link,
          type: 'text/html'
        }]
      };
    });

    return {
      title: feedTitle,
      description: feedDescription,
      link: feedLink,
      items: standardItems
    };
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    return { title: 'Error', items: [] };
  }
}
