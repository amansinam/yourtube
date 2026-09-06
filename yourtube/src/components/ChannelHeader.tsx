import { useState } from "react";
import { AppUser } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import ChannelDialogue from "./ChannelDialogue";

export default function ChannelHeader({
  channel,
  onUpdated,
}: {
  channel: AppUser;
  onUpdated: (updated: AppUser) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const isOwner = user?._id === channel._id;

  return (
    <div className="px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-semibold text-gray-700 shrink-0">
        {(channel.channelname || channel.email)[0]?.toUpperCase()}
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900">{channel.channelname || channel.email}</h1>
        <p className="text-sm text-gray-600 mt-1">{channel.description || "No description yet."}</p>
      </div>
      {isOwner && (
        <button
          onClick={() => setEditing(true)}
          className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-sm font-medium"
        >
          Edit channel
        </button>
      )}

      {editing && (
        <ChannelDialogue
          channel={channel}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
