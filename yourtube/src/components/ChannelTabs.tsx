import * as Tabs from "@radix-ui/react-tabs";
import { ReactNode } from "react";

export default function ChannelTabs({
  videosContent,
  aboutContent,
}: {
  videosContent: ReactNode;
  aboutContent: ReactNode;
}) {
  return (
    <Tabs.Root defaultValue="videos" className="px-4 sm:px-8">
      <Tabs.List className="flex gap-6 border-b border-gray-200">
        <Tabs.Trigger
          value="videos"
          className="py-3 text-sm font-medium text-gray-600 data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black"
        >
          Videos
        </Tabs.Trigger>
        <Tabs.Trigger
          value="about"
          className="py-3 text-sm font-medium text-gray-600 data-[state=active]:text-black data-[state=active]:border-b-2 data-[state=active]:border-black"
        >
          About
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="videos" className="py-4">
        {videosContent}
      </Tabs.Content>
      <Tabs.Content value="about" className="py-4">
        {aboutContent}
      </Tabs.Content>
    </Tabs.Root>
  );
}
