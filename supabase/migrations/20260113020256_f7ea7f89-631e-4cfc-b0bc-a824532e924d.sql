-- Clean up orphan article_queue items that cause "black holes" in calendar
-- These items have no article_id and appear as unclickable dots

DELETE FROM article_queue 
WHERE article_id IS NULL;

-- Add index for better performance on calendar queries
CREATE INDEX IF NOT EXISTS idx_articles_calendar_display 
ON articles (blog_id, status, published_at, scheduled_at, created_at);