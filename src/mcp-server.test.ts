import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { server } from "./mcp-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import rssManager from "./rss-manager";

// 型定義
interface FeedItem {
  title: string;
  summary: string;
  published: string;
  origin: string;
  link: string;
  categories: string[];
}

interface FeedResponse {
  items: FeedItem[];
}

interface Feed {
  id: string;
  title: string;
  url: string;
}

// モックの設定
import { mock } from "bun:test";

mock.module("./rss-manager", () => {
  return {
    default: {
      fetchFeeds: async (limit: number) => ({
        items: [
          {
            title: "テスト記事1",
            summary: "テスト記事1の内容",
            published: "2025-03-16T08:00:00.000Z",
            origin: "テストブログ",
            link: "https://example.com/article1",
            categories: ["テスト", "ブログ"]
          },
          {
            title: "テスト記事2",
            summary: "テスト記事2の内容",
            published: "2025-03-16T07:00:00.000Z",
            origin: "テストブログ",
            link: "https://example.com/article2",
            categories: ["テスト", "ニュース"]
          }
        ]
      }),
      getFeeds: () => [
        {
          id: "feed1",
          title: "テストブログ",
          url: "https://example.com/feed"
        }
      ]
    }
  };
});

describe("MCP Server", () => {
  let client: Client;
  let transport: InMemoryTransport;

  beforeAll(async () => {
    // インメモリ通信チャネルの作成
    const [clientTp, serverTp] = InMemoryTransport.createLinkedPair();
    
    // サーバーをトランスポートに接続
    await server.connect(serverTp);
    
    // クライアントを作成
    client = new Client({
      name: "test client",
      version: "0.1.0",
    });
    
    // クライアントを接続
    await client.connect(clientTp);
    
    // トランスポートを保存
    transport = clientTp;
  });

  afterAll(async () => {
    // テスト終了後にトランスポートを閉じる
    await transport.close();
  });

  test("fetchRssFeeds tool should return feed items", async () => {
    // fetchRssFeedsツールを呼び出す
    const response = await client.callTool({
      name: "fetchRssFeeds",
      arguments: { limit: 10 }
    });
    
    // レスポンスをキャスト
    const feedResponse = response as unknown as FeedResponse;
    
    // レスポンスが期待通りの形式であることを確認
    expect(feedResponse).toBeDefined();
    expect(Array.isArray(feedResponse.items)).toBe(true);
    expect(feedResponse.items.length).toBeGreaterThan(0);
    
    // 最初の記事の内容を確認
    const firstItem = feedResponse.items[0];
    expect(firstItem.title).toBe("テスト記事1");
    expect(firstItem.summary).toBe("テスト記事1の内容");
    expect(firstItem.origin).toBe("テストブログ");
    expect(firstItem.link).toBe("https://example.com/article1");
    expect(Array.isArray(firstItem.categories)).toBe(true);
  });

  test("listRssFeeds tool should return available feeds", async () => {
    // listRssFeedsツールを呼び出す
    const response = await client.callTool({
      name: "listRssFeeds",
      arguments: {}
    });
    
    // レスポンスをキャスト
    const feeds = response as unknown as Feed[];
    
    // レスポンスが期待通りの形式であることを確認
    expect(feeds).toBeDefined();
    expect(Array.isArray(feeds)).toBe(true);
    expect(feeds.length).toBeGreaterThan(0);
    
    // 最初のフィードの内容を確認
    const firstFeed = feeds[0];
    expect(firstFeed.id).toBe("feed1");
    expect(firstFeed.title).toBe("テストブログ");
    expect(firstFeed.url).toBe("https://example.com/feed");
  });
});
