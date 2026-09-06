import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import ChannelHeader from "@/components/ChannelHeader";
import ChannelTabs from "@/components/ChannelTabs";
import ChannelVideos from "@/components/ChannelVideos";
import api from "@/lib/api";
import { AppUser } from "@/lib/types";

export default function ChannelPage() {
  const router = useRouter();
  const { id } = router.query;
  const channelId = typeof id === "string" ? id : "";

  const [channel, setChannel] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fixes bug #10: fetches the channel that matches the ID in the URL,
        // instead of always rendering the currently logged-in user.
        const { data } = await api.get(`/user/${channelId}`);
        if (!cancelled) {
          if (data?.success) {
            setChannel(data.user);
          } else {
            setError("Channel not found.");
          }
        }
      } catch (err) {
        console.error("Failed to load channel:", err);
        if (!cancelled) setError("Channel not found.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  return (
    <Layout title={channel ? `${channel.channelname} - YourTube` : "Channel - YourTube"}>
      {loading ? (
        <div className="px-8 py-12 text-gray-500">Loading channel...</div>
      ) : error || !channel ? (
        <div className="px-8 py-12 text-gray-500">{error || "Channel not found."}</div>
      ) : (
        <>
          <ChannelHeader channel={channel} onUpdated={setChannel} />
          <ChannelTabs
            videosContent={<ChannelVideos channelId={channel._id} />}
            aboutContent={
              <div className="text-sm text-gray-700 max-w-2xl">
                <p>{channel.description || "No description provided."}</p>
                <p className="text-gray-500 mt-4">{channel.email}</p>
              </div>
            }
          />
        </>
      )}
    </Layout>
  );
}
