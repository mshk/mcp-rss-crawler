# MCP-RSS-Crawler

An MCP (Message Chain Protocol) server that fetches RSS feeds and shares them with LLMs.

## Features

- Automatic fetching and caching of RSS feeds
- MCP protocol implementation for seamless LLM integration
- Support for filtering feeds by category, source, or keywords
- Customizable refresh intervals for feed updates
- Stateless authentication using JWT tokens
- Comprehensive API endpoints for feed management
- Command-line interface for server administration

## Setup as MCP Server

1. Clone this repository
2. Create a `.env` file based on `.env.example` with your configuration
3. Install dependencies:
   ```
   bun install
   ```
4. Start the server:
   ```
   bun start
   ```
5. Configure your LLM client to use the MCP endpoint at `http://localhost:3000/mcp`
6. For Claude Desktop, copy `claude_desktop_config.json.example` to your Claude Desktop config directory and update the values as needed

## Usage

1. Start the server with `bun start`
2. Your MCP endpoint will be available at `http://localhost:3000/mcp`
3. Configure your LLM client to use this MCP endpoint

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

## API Endpoints

- `/status` - Check server status
- `/mcp` - MCP protocol endpoint for LLM integration

## Configuration Options

The server can be configured through environment variables or a `.env` file:

- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret for JWT token generation
- `REFRESH_INTERVAL` - Feed refresh interval in minutes (default: 30)
- `MAX_ITEMS_PER_FEED` - Maximum number of items to fetch per feed (default: 20)

## Troubleshooting

- For connection issues, check your network settings and firewall configuration
- Logs are available in the console and can be used to diagnose problems
- For more detailed logging, set the `DEBUG=mcp-rss:*` environment variable
