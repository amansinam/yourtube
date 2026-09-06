import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { AppUser } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

export default function ChannelDialogue({
  channel,
  onClose,
  onSaved,
}: {
  channel: AppUser;
  onClose: () => void;
  onSaved: (updated: AppUser) => void;
}) {
  const { refreshUser } = useAuth();
  const [channelname, setChannelname] = useState(channel.channelname || "");
  const [description, setDescription] = useState(channel.description || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!channelname.trim()) {
      toast.error("Channel name can't be empty");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch(`/user/update/${channel._id}`, {
        channelname: channelname.trim(),
        description: description.trim(),
      });
      if (data?.success) {
        onSaved(data.user);
        await refreshUser();
        toast.success("Channel updated");
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update channel");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !saving && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl w-full max-w-md p-6 z-[70]">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">Edit channel</Dialog.Title>
            <button onClick={onClose} disabled={saving} className="p-1 hover:bg-gray-100 rounded-full">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Channel name</label>
              <input
                value={channelname}
                onChange={(e) => setChannelname(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white rounded-full py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
