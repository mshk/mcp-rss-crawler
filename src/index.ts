#!/usr/bin/env bun
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import rssManager from './rss-manager';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = new Hono();
const port = process.env.PORT ? parseInt(process.env.PORT) : 5556;

// Status endpoint
app.get('/status', (c) => {
  return c.json({ status: 'ok', service: 'mcp-rss-manager' });
});

// MCP endpoint
app.post('/mcp', async (c) => {
  try {
    const request = await c.req.json();
    
    // Process the request using the MCP server
    // Since we don't have direct HTTP handling in the MCP SDK,
    // we'll manually process the request and format the response
    
    // The request should contain a method and params
    const { method, params } = request;
    
    let response;
    if (method === 'fetchRssFeeds') {
      const { limit } = params || { limit: 10 };
      const feeds = await rssManager.fetchFeeds(limit);
      response = { result: feeds };
    } else {
      response = { error: { code: -32601, message: 'Method not found' } };
    }
    
    return c.json(response);
  } catch (error) {
    console.error('Error processing MCP request:', error);
    return c.json({ 
      error: { 
        code: -32603, 
        message: 'Internal error',
        data: error instanceof Error ? error.message : String(error)
      }
    }, 500);
  }
});

// API endpoint to get latest feeds
app.get('/api/feeds', async (c) => {
  try {
    // Get the limit parameter from the query string, default to 10
    const limitParam = c.req.query('limit');
    const limit = limitParam ? parseInt(limitParam) : 10;
    
    // Get the latest feeds from RSS Manager
    const feeds = await rssManager.getLatestArticles(limit);
    
    return c.json({ 
      status: 'success',
      count: feeds.items.length,
      feeds
    });
  } catch (error: any) {
    console.error('Error fetching feeds:', error);
    return c.json({ 
      status: 'error',
      message: error.message,
      error: error.toString()
    }, 500);
  }
});

// API endpoint to get feeds by category
app.get('/api/feeds/category/:category', async (c) => {
  try {
    const category = c.req.param('category');
    const limitParam = c.req.query('limit');
    const limit = limitParam ? parseInt(limitParam) : 10;
    
    const feeds = await rssManager.getFeedsByCategory(category, limit);
    
    return c.json({ 
      status: 'success',
      category,
      count: feeds.items.length,
      feeds
    });
  } catch (error: any) {
    console.error(`Error fetching feeds for category ${c.req.param('category')}:`, error);
    return c.json({ 
      status: 'error',
      message: error.message,
      error: error.toString()
    }, 500);
  }
});

// API endpoint to search feeds
app.get('/api/feeds/search', async (c) => {
  try {
    const query = c.req.query('q');
    if (!query) {
      return c.json({ 
        status: 'error',
        message: 'Search query is required'
      }, 400);
    }
    
    const limitParam = c.req.query('limit');
    const limit = limitParam ? parseInt(limitParam) : 10;
    
    const feeds = await rssManager.searchFeeds(query, limit);
    
    return c.json({ 
      status: 'success',
      query,
      count: feeds.items.length,
      feeds
    });
  } catch (error: any) {
    console.error(`Error searching feeds:`, error);
    return c.json({ 
      status: 'error',
      message: error.message,
      error: error.toString()
    }, 500);
  }
});

// API endpoint to list all configured feeds
app.get('/api/feeds/list', (c) => {
  try {
    const feeds = rssManager.getFeeds();
    
    return c.json({ 
      status: 'success',
      count: feeds.length,
      feeds
    });
  } catch (error: any) {
    console.error('Error listing feeds:', error);
    return c.json({ 
      status: 'error',
      message: error.message,
      error: error.toString()
    }, 500);
  }
});

// Start the server
serve({
  fetch: app.fetch,
  port: process.env.PORT ? parseInt(process.env.PORT) : 5556, 
}, (info) => {
  console.error(`RSS Manager server is running at http://localhost:${info.port}`);
  console.error(`MCP endpoint available at http://localhost:${info.port}/mcp`);
  console.error(`API endpoints available at http://localhost:${info.port}/api/feeds`);
});
