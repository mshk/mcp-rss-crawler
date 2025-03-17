#!/usr/bin/env bun
import { server } from './mcp-server';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";


// メイン関数
async function main() {
  let transport: StdioServerTransport | null = null;

  try {
    // RSS Manager MCPサーバーの起動
    console.error("Starting RSS Manager MCP Server...");
    
    // 標準入出力を使用するトランスポートを作成
    transport = new StdioServerTransport();
    
    // サーバーをトランスポートに接続
    await server.connect(transport);
    
    // サーバーが動作していることをログに出力
    console.error("RSS Manager MCP Server running on stdio");
  } catch (error) {
    console.error("Error in MCP server:", error);
    
    // エラーの詳細情報を出力
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    
    process.exit(1);
  }
}

// エントリーポイント
main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  
  // エラーの詳細情報を出力
  if (error instanceof Error) {
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
  }
  
  process.exit(1);
});
