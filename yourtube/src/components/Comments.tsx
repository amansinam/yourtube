import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Pencil, Reply, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Comment } from "@/lib/types";

type Sort = "newest" | "oldest" | "liked" | "relevant";

function CommentItem({ comment, depth, onReload }: { comment: Comment; depth?: number; onReload: () => void }) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.commentbody);
  const [busy, setBusy] = useState(false);
  const isOwner = Boolean(user && user._id === comment.userid);
  const name = comment.author?.name || comment.usercommented || "Unknown user";

  async function react(reaction: "like" | "dislike") {
    if (!user) return toast.error("Sign in to react to comments");
    setBusy(true);
    try { await api.post(`/comment/${comment._id}/reaction`, { userId: user._id, reaction }); await onReload(); }
    catch { toast.error("Couldn't update reaction"); } finally { setBusy(false); }
  }
  async function submitReply() {
    if (!user) return toast.error("Sign in to reply");
    if (!replyText.trim()) return;
    setBusy(true);
    try { await api.post("/comment/postcomment", { userid: user._id, videoid: comment.videoid, parentComment: comment._id, commentbody: replyText }); setReplyText(""); setReplying(false); await onReload(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Couldn't post reply"); } finally { setBusy(false); }
  }
  async function saveEdit() {
    if (!user || !editText.trim()) return;
    setBusy(true);
    try { await api.post(`/comment/editcomment/${comment._id}`, { userId: user._id, commentbody: editText }); setEditing(false); await onReload(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Couldn't update comment"); } finally { setBusy(false); }
  }
  async function remove() {
    if (!user || !window.confirm("Delete this comment? Replies will remain visible.")) return;
    setBusy(true);
    try { await api.delete(`/comment/deletecomment/${comment._id}`, { data: { userId: user._id } }); await onReload(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Couldn't delete comment"); } finally { setBusy(false); }
  }

  return <div className={depth ? "ml-5 border-l border-gray-100 pl-4 sm:ml-10" : ""}>
    <div className="flex gap-3 py-3">
      {comment.author?.image ? <img src={comment.author.image} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">{name[0]?.toUpperCase() || "?"}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2"><span className="text-sm font-semibold text-gray-900">{name}</span><span className="text-xs text-gray-500">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>{comment.editedAt && <span className="text-xs text-gray-500">(Edited)</span>}</div>
        {comment.isDeleted ? <p className="mt-1 text-sm italic text-gray-500">[Comment deleted]</p> : editing ? <div className="mt-2 flex gap-2"><input value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={1000} className="min-w-0 flex-1 border-b border-gray-300 text-sm outline-none focus:border-blue-600" /><button onClick={saveEdit} disabled={busy} className="text-xs font-semibold text-blue-600">Save</button><button onClick={() => setEditing(false)} className="text-xs text-gray-500">Cancel</button></div> : <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{comment.commentbody}</p>}
        {!comment.isDeleted && <div className="mt-2 flex flex-wrap items-center gap-3"><button onClick={() => react("like")} disabled={busy} className={`flex items-center gap-1 text-xs ${comment.viewerReaction === "like" ? "text-blue-600" : "text-gray-600"}`}><ThumbsUp size={14} /> {comment.likeCount || 0}</button><button onClick={() => react("dislike")} disabled={busy} className={`flex items-center gap-1 text-xs ${comment.viewerReaction === "dislike" ? "text-blue-600" : "text-gray-600"}`}><ThumbsDown size={14} /> {comment.dislikeCount || 0}</button>{user && <button onClick={() => setReplying(!replying)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"><Reply size={14} /> Reply</button>}{isOwner && <><button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-gray-600"><Pencil size={13} /> Edit</button><button onClick={remove} disabled={busy} className="flex items-center gap-1 text-xs text-red-600"><Trash2 size={13} /> Delete</button></>}</div>}
        {replying && <div className="mt-3 flex gap-2"><input autoFocus value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={1000} placeholder={`Reply to ${name}`} className="min-w-0 flex-1 rounded-full border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-600" /><button onClick={submitReply} disabled={busy || !replyText.trim()} className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Reply</button></div>}
      </div>
    </div>
    {comment.replies?.map((reply) => <CommentItem key={reply._id} comment={reply} depth={(depth || 0) + 1} onReload={onReload} />)}
  </div>;
}

export default function Comments({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]); const [loading, setLoading] = useState(true); const [text, setText] = useState(""); const [sort, setSort] = useState<Sort>("newest"); const [submitting, setSubmitting] = useState(false);
  async function loadComments() { setLoading(true); try { const { data } = await api.get(`/comment/${videoId}`, { params: { sort, viewerId: user?._id } }); setComments(data.comments || []); } catch { toast.error("Couldn't load comments"); } finally { setLoading(false); } }
  useEffect(() => { if (videoId) loadComments(); }, [videoId, sort, user?._id]);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!user) return toast.error("Sign in to comment"); if (!text.trim()) return; setSubmitting(true); try { await api.post("/comment/postcomment", { userid: user._id, videoid: videoId, commentbody: text }); setText(""); await loadComments(); } catch (error: any) { toast.error(error?.response?.data?.message || "Couldn't post comment"); } finally { setSubmitting(false); } }
  const count = comments.reduce((total, item) => total + 1 + (item.replies?.length || 0), 0);
  return <section className="mt-8 border-t border-gray-100 pt-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-semibold"><MessageCircle size={18} /> {count} Comments</h2><label className="text-sm text-gray-600">Sort <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="ml-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="liked">Most liked</option><option value="relevant">Most relevant</option></select></label></div><form onSubmit={submit} className="mb-5 flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder={user ? "Add a comment…" : "Sign in to comment"} disabled={!user} className="min-w-0 flex-1 border-b border-gray-300 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-transparent" />{user && <button disabled={submitting || !text.trim()} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Comment</button>}</form>{loading ? <p className="text-sm text-gray-500">Loading comments…</p> : comments.length ? <div>{comments.map((comment) => <CommentItem key={comment._id} comment={comment} onReload={loadComments} />)}</div> : <p className="text-sm text-gray-500">No comments yet. Be the first to comment.</p>}</section>;
}
