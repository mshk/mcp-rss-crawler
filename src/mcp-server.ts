import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import rssManager from './rss-manager';

// MCPサーバーインスタンスの作成
export const server = new McpServer({
  name: "RssFeedMCP",
  version: "0.1.0",
});

// RSS Managerからフィードを取得するツール
server.tool(
  "fetchRssFeeds",
  "Fetch articles from configured RSS feeds",
  { limit: z.number().min(1).max(50).default(10).describe("Number of articles to retrieve") },
  async ({ limit }) => {
    try {
      // RSS Managerからフィードを取得
      const feeds = await rssManager.fetchFeeds(limit);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(feeds, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error fetching RSS feeds:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching RSS feeds: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// RSS Managerから最新のフィードを取得するツール
server.tool(
  "getLatestRssFeeds",
  "Get the latest articles from configured RSS feeds",
  { limit: z.number().min(1).max(50).default(10).describe("Number of articles to retrieve") },
  async ({ limit }) => {
    try {
      // RSS Managerから最新のフィードを取得
      const feeds = await rssManager.getLatestArticles(limit);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(feeds, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error retrieving latest RSS feeds:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving latest RSS feeds: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// RSS Managerからカテゴリ別のフィードを取得するツール
server.tool(
  "fetchRssFeedsByCategory",
  "Fetch articles from configured RSS feeds by category",
  { 
    category: z.string().describe("Category name to filter feeds by"),
    limit: z.number().min(1).max(50).default(10).describe("Number of articles to retrieve") 
  },
  async ({ category, limit }) => {
    try {
      // RSS Managerからカテゴリ別のフィードを取得
      const feeds = await rssManager.getFeedsByCategory(category, limit);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(feeds, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error fetching RSS feeds by category:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching RSS feeds by category: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// RSS Managerでフィードを検索するツール
server.tool(
  "searchRssFeeds",
  "Search for articles in configured RSS feeds",
  { 
    query: z.string().describe("Search query"),
    limit: z.number().min(1).max(50).default(10).describe("Number of articles to retrieve") 
  },
  async ({ query, limit }) => {
    try {
      // RSS Managerでフィードを検索
      const feeds = await rssManager.searchFeeds(query, limit);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(feeds, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error searching RSS feeds:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error searching RSS feeds: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// RSSフィードの一覧を取得するツール
server.tool(
  "listRssFeeds",
  "Get a list of all configured RSS feeds",
  {},
  async () => {
    try {
      // RSS Managerからフィード一覧を取得
      const feeds = rssManager.getFeeds();
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(feeds, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error listing RSS feeds:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error listing RSS feeds: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// RSSフィードを追加するツール
server.tool(
  "addRssFeed",
  "Add a new RSS feed to the database",
  { 
    url: z.string().url().describe("URL of the RSS feed"),
    name: z.string().describe("Name of the RSS feed"),
    category: z.string().optional().describe("Category of the RSS feed (optional)") 
  },
  async ({ url, name, category }) => {
    try {
      // RSS Managerにフィードを追加
      const success = rssManager.addFeed({ url, name, category });
      
      if (success) {
        return {
          content: [
            {
              type: "text",
              text: `Successfully added RSS feed: ${name} (${url})`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to add RSS feed: ${name} (${url}). The feed may already exist.`,
            },
          ],
          isError: true
        };
      }
    } catch (error: any) {
      console.error("Error adding RSS feed:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error adding RSS feed: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// RSSフィードを削除するツール
server.tool(
  "removeRssFeed",
  "Remove an RSS feed from the database",
  { 
    url: z.string().url().describe("URL of the RSS feed to remove")
  },
  async ({ url }) => {
    try {
      // RSS Managerからフィードを削除
      const success = rssManager.removeFeed(url);
      
      if (success) {
        return {
          content: [
            {
              type: "text",
              text: `Successfully removed RSS feed: ${url}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to remove RSS feed: ${url}. The feed may not exist.`,
            },
          ],
          isError: true
        };
      }
    } catch (error: any) {
      console.error("Error removing RSS feed:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error removing RSS feed: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// ユーザーの興味キーワード一覧を取得するツール
server.tool(
  "listKeywords",
  "Get a list of all user interest keywords",
  {},
  async () => {
    try {
      // RSS Managerからキーワード一覧を取得
      const keywords = rssManager.getKeywords();
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(keywords, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error listing keywords:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error listing keywords: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// ユーザーの興味キーワードを追加するツール
server.tool(
  "addKeyword",
  "Add a new interest keyword to the database",
  { 
    keyword: z.string().min(1).describe("Interest keyword to add")
  },
  async ({ keyword }) => {
    try {
      // RSS Managerにキーワードを追加
      const success = rssManager.addKeyword(keyword);
      
      if (success) {
        return {
          content: [
            {
              type: "text",
              text: `Successfully added interest keyword: "${keyword}"`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to add interest keyword: "${keyword}". The keyword may already exist.`,
            },
          ],
          isError: true
        };
      }
    } catch (error: any) {
      console.error("Error adding keyword:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error adding keyword: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// ユーザーの興味キーワードを削除するツール
server.tool(
  "removeKeyword",
  "Remove an interest keyword from the database",
  { 
    keyword: z.string().min(1).describe("Interest keyword to remove")
  },
  async ({ keyword }) => {
    try {
      // RSS Managerからキーワードを削除
      const success = rssManager.removeKeyword(keyword);
      
      if (success) {
        return {
          content: [
            {
              type: "text",
              text: `Successfully removed interest keyword: "${keyword}"`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to remove interest keyword: "${keyword}". The keyword may not exist.`,
            },
          ],
          isError: true
        };
      }
    } catch (error: any) {
      console.error("Error removing keyword:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error removing keyword: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// ユーザーの興味キーワードに一致する記事を取得するツール
server.tool(
  "getArticlesByKeywords",
  "Get articles matching user interest keywords",
  { 
    limit: z.number().min(1).max(50).default(10).describe("Number of articles to retrieve")
  },
  async ({ limit }) => {
    try {
      // RSS Managerからキーワードに一致する記事を取得
      const articles = await rssManager.getArticlesByKeywords(limit);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(articles, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error("Error getting articles by keywords:", error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error getting articles by keywords: ${error.message}`,
          },
        ],
        isError: true
      };
    }
  }
);

// Add a tool to fetch articles from a specified URL using firecrawl
server.tool(
  "fetchArticle",
  "Fetch an article from a specified URL using firecrawl",
  {
    url: z.string().url().describe("URL of the article to fetch")
  },
  async ({ url }) => {
    try {
      console.error(`Fetching article from URL: ${url}`);
      
      // Use the RSS manager to fetch the article
      const article = await rssManager.fetchArticleFromUrl(url);
      
      if (!article) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to fetch article from the URL."
            }
          ],
          isError: true
        };
      }
      
      // Format the article content for the response
      return {
        content: [
          {
            type: "text",
            text: `# ${article.title || 'Article'}\n\n${article.content || ''}`
          }
        ]
      };
    } catch (error) {
      console.error(`Error in fetchArticle tool: ${error}`);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching article: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add a tool to get all articles from the database
server.tool(
  "getArticles",
  "Get all articles from the database",
  {
    limit: z.number().optional().describe("Maximum number of articles to return (default: 10)")
  },
  async ({ limit = 10 }) => {
    try {
      console.error(`Getting articles with limit: ${limit}`);
      
      // Use the RSS manager to get articles
      const articles = rssManager.getArticles(limit);
      
      if (!articles || articles.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No articles found in the database."
            }
          ]
        };
      }
      
      // Format the articles for the response
      let responseText = "# Articles\n\n";
      
      articles.forEach((article, index) => {
        responseText += `## ${index + 1}. ${article.title || 'Untitled Article'}\n`;
        responseText += `- URL: ${article.url}\n`;
        if (article.author) responseText += `- Author: ${article.author}\n`;
        if (article.published_date) responseText += `- Published: ${article.published_date}\n`;
        if (article.summary) responseText += `\n${article.summary}\n\n`;
        responseText += `---\n\n`;
      });
      
      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
    } catch (error) {
      console.error(`Error in getArticles tool: ${error}`);
      return {
        content: [
          {
            type: "text",
            text: `Error getting articles: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

// Add a tool to search articles in the database
server.tool(
  "searchArticles",
  "Search articles in the database",
  {
    query: z.string().describe("Search query"),
    limit: z.number().optional().describe("Maximum number of articles to return (default: 10)")
  },
  async ({ query, limit = 10 }) => {
    try {
      console.error(`Searching articles with query: ${query}, limit: ${limit}`);
      
      // Use the RSS manager to search articles
      const articles = rssManager.searchArticles(query, limit);
      
      if (!articles || articles.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No articles found matching the query: "${query}"`
            }
          ]
        };
      }
      
      // Format the articles for the response
      let responseText = `# Search Results for "${query}"\n\n`;
      
      articles.forEach((article, index) => {
        responseText += `## ${index + 1}. ${article.title || 'Untitled Article'}\n`;
        responseText += `- URL: ${article.url}\n`;
        if (article.author) responseText += `- Author: ${article.author}\n`;
        if (article.published_date) responseText += `- Published: ${article.published_date}\n`;
        if (article.summary) responseText += `\n${article.summary}\n\n`;
        responseText += `---\n\n`;
      });
      
      return {
        content: [
          {
            type: "text",
            text: responseText
          }
        ]
      };
    } catch (error) {
      console.error(`Error in searchArticles tool: ${error}`);
      return {
        content: [
          {
            type: "text",
            text: `Error searching articles: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);
