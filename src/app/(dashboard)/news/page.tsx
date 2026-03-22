import { Newspaper, Plus, RefreshCw, ExternalLink, Clock, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const placeholderFeeds = [
  { name: "Marketing Industry News", url: "rss://example.com/feed", category: "Marketing", items: 0 },
  { name: "Social Media Today", url: "rss://example.com/feed2", category: "Social Media", items: 0 },
  { name: "Content Strategy", url: "rss://example.com/feed3", category: "Content", items: 0 },
];

const categoryColors: Record<string, string> = {
  Marketing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Social Media": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Content: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
            <Newspaper className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">News Consolidator</h1>
            <p className="text-sm text-muted-foreground">Aggregate industry news and content ideas from RSS feeds.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh Feeds
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Feed
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs">Active Feeds</CardDescription>
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{placeholderFeeds.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">RSS sources configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs">Unread Articles</CardDescription>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground mt-0.5">Refresh to fetch latest</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs">Saved Articles</CardDescription>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground mt-0.5">Bookmark articles for later</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Feed sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Feed Sources</CardTitle>
            <CardDescription className="text-xs">Manage your RSS and news sources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {placeholderFeeds.map((feed) => (
              <div
                key={feed.name}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{feed.name}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 mt-1 ${categoryColors[feed.category] ?? ""}`}
                  >
                    {feed.category}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 shrink-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-2">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Feed Source
            </Button>
          </CardContent>
        </Card>

        {/* Article feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Latest Articles</CardTitle>
                <CardDescription className="text-xs">Aggregated from all your feeds</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">0 new</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[240px] gap-3 border-2 border-dashed border-border rounded-lg">
            <Newspaper className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No articles yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add feed sources and click <span className="font-medium text-foreground">Refresh Feeds</span> to load articles.
              </p>
            </div>
            <Button size="sm" variant="secondary">
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Fetch Articles
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
