import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Comment } from "@/lib/types";

export default function Comments({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadComments() {
    setLoading(true);
    try {
      const { data } = await api.get(`/comment/${videoId}`);
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (videoId) loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to comment");
      return;
    }
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      await api.post("/comment/postcomment", {
        userid: user._id,
        videoid: videoId,
        commentbody: text.trim(),
        usercommented: user.channelname || user.name || user.email,
      });
      setText("");
      await loadComments();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't post comment");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment._id);
    setEditingText(comment.commentbody);
  }

  async function saveEdit(id: string) {
    if (!editingText.trim()) return;
    try {
      await api.post(`/comment/editcomment/${id}`, { commentbody: editingText.trim() });
      setEditingId(null);
      await loadComments();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't update comment");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/comment/deletecomment/${id}`);
      await loadComments();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't delete comment");
    }
  }

  return (
    <div className="mt-6">
      <h2 className="text-base font-semibold mb-4">{comments.length} Comments</h2>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={user ? "Add a comment..." : "Sign in to comment"}
          disabled={!user}
          className="flex-1 border-b border-gray-300 focus:border-black outline-none py-1 text-sm disabled:bg-transparent disabled:text-gray-400"
        />
        {text && (
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium disabled:opacity-50"
          >
            Comment
          </button>
        )}
      </form>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment._id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-300 shrink-0 flex items-center justify-center text-sm font-semibold text-gray-700">
                {comment.usercommented?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.usercommented}</span>
                  <span className="text-xs text-gray-500">
                    {(() => {
                      try {
                        return formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        });
                      } catch {
                        return "";
                      }
                    })()}
                  </span>
                </div>

                {editingId === comment._id ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="flex-1 border-b border-gray-300 focus:border-black outline-none text-sm py-0.5"
                    />
                    <button
                      onClick={() => saveEdit(comment._id)}
                      className="text-xs text-blue-600 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-800 mt-0.5">{comment.commentbody}</p>
                )}

                {user && comment.userid === user._id && editingId !== comment._id && (
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => startEdit(comment)}
                      className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comment._id)}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
