export interface AppUser {
  _id: string;
  email: string;
  name?: string;
  channelname?: string;
  description?: string;
  image?: string;
  joinedon?: string;
}

export interface Video {
  _id: string;
  videotitle: string;
  filename: string; // normalized filename, build full URL with getVideoUrl()
  filetype: string;
  filepath: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  cloudinaryPublicId?: string;
  filesize: number;
  videochanel: string;
  category?: string;
  Like: number;
  views: number;
  uploader?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  userid: string;
  videoid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  createdAt: string;
  updatedAt: string;
  parentComment?: string | null;
  replies?: Comment[];
  likeCount?: number;
  dislikeCount?: number;
  viewerReaction?: "like" | "dislike" | null;
  editedAt?: string | null;
  isDeleted?: boolean;
  author?: { _id: string; name: string; image?: string | null } | null;
}
