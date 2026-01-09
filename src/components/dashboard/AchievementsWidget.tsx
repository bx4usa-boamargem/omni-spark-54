import { AchievementsBadges } from "@/components/profile/AchievementsBadges";

interface AchievementsWidgetProps {
  userId: string;
  blogId: string;
}

export function AchievementsWidget({ userId, blogId }: AchievementsWidgetProps) {
  return <AchievementsBadges userId={userId} blogId={blogId} compact />;
}
