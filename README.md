# MCP-RSS-Crawler

An MCP (Message Chain Protocol) server that fetches RSS feeds and shares them with LLMs.

## Features

- Fetching and caching of RSS feeds (SQLite database)
- MCP protocol implementation for seamless LLM integration
- Support for filtering feeds by category, source, or keywords
- Comprehensive API endpoints for feed management

## Requirements

- Bun
- Firecrawl API key
- Claude Desktop or other MCP client

## Setup as MCP Server

1. Clone this repository
2. Create a `claude_desktop_config.json` file based on `claude_desktop_config.json.example` with your configuration
3. Install dependencies:
   ```
   bun install
   ```
4. Start Claude Desktop:

## MCP Protocol

The server implements the Message Chain Protocol (MCP) which allows LLMs to access your latest RSS feeds. The MCP endpoint accepts POST requests with a JSON body containing a messages array and returns a response with the latest feed items.

Example request:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What are the latest news from my RSS feeds?"
    }
  ]
}
```

Example response:
```json
{
  "messages": [
    {
      "role": "assistant",
      "content": "Here are the latest articles from your RSS feeds:",
      "name": "rss-mcp"
    },
    {
      "role": "tool",
      "content": "[{\"title\":\"Article Title\",\"summary\":\"Article summary...\",\"published\":\"2025-03-16T04:30:00.000Z\",\"origin\":\"Feed Name\",\"link\":\"https://example.com/article\"}]",
      "name": "rss-feeds"
    }
  ]
}
```

## Configuration Options

The server can be configured through environment variables or a `.env` file:

- `PORT` - Server port (default: 5556)
- `FIRECRAWL_API_KEY` - Firecrawl API key

## Troubleshooting

- For connection issues, check your network settings and firewall configuration
- Logs are available in the console and can be used to diagnose problems
- For more detailed logging, set the `DEBUG=mcp-rss:*` environment variable
