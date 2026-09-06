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
  filesize: number;
  videochanel: string;
  Like: number;
  views: number;
  uploader?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  userid?: string;
  videoid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  createdAt: string;
  updatedAt: string;
}
