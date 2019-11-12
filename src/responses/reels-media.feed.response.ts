export interface ReelsMediaFeedResponseRootObject {
  reels: ReelsMediaFeedResponseReels;
  status: string;
}
export interface ReelsMediaFeedResponseReels {
  [pk: string]: ReelsMediaFeedResponse;
}
export interface ReelsMediaFeedResponse {
  id: number;
  latest_reel_media: number;
  expiring_at: number;
  seen: number;
  can_reply: boolean;
  can_reshare: boolean;
  reel_type: string;
  user: ReelsMediaFeedResponseUser;
  items: ReelsMediaFeedResponseItem[];
  prefetch_count: number;
  media_count: number;
}
export interface ReelsMediaFeedResponseUser {
  pk: number;
  username?: string;
  full_name?: string;
  is_private?: boolean;
  profile_pic_url?: string;
  profile_pic_id?: string;
  friendship_status?: ReelsMediaFeedResponseFriendshipStatus;
  is_verified?: boolean;
}
export interface ReelsMediaFeedResponseFriendshipStatus {
  following: boolean;
  is_private: boolean;
  incoming_request: boolean;
  outgoing_request: boolean;
  is_bestie: boolean;
}
export interface ReelsMediaFeedResponseItem {
  taken_at: number;
  pk: string;
  id: string;
  device_timestamp: string;
  media_type: number;
  code: string;
  client_cache_key: string;
  filter_type: number;
  image_versions2: ReelsMediaFeedResponseImageVersions2;
  original_width: number;
  original_height: number;
  caption_position: number;
  is_reel_media: boolean;
  is_dash_eligible: number;
  video_dash_manifest: string;
  video_codec: string;
  number_of_qualities: number;
  video_versions: ReelsMediaFeedResponseVideoVersionsItem[];
  has_audio: boolean;
  video_duration: number;
  user: ReelsMediaFeedResponseUser;
  caption_is_edited: boolean;
  photo_of_you: boolean;
  caption: null;
  can_viewer_save: boolean;
  organic_tracking_token: string;
  expiring_at: number;
  can_reshare: boolean;
  can_reply: boolean;
  reel_mentions?: ReelsMediaFeedResponseReelMentionsItem[];
  supports_reel_reactions: boolean;
  show_one_tap_fb_share_tooltip: boolean;
  has_shared_to_fb: number;
  ad_action?: string;
  link_text?: string;
  story_cta?: ReelsMediaFeedResponseStoryCtaItem[];
  imported_taken_at?: number;
  story_polls?: StoryPollResponseItem[];
  story_sliders?: StorySlidersrResponseItem[];
  story_quizs?: StoryQuizsResponseItem[];
}
export interface ReelsMediaFeedResponseImageVersions2 {
  candidates: ReelsMediaFeedResponseCandidatesItem[];
}
export interface ReelsMediaFeedResponseCandidatesItem {
  width: number;
  height: number;
  url: string;
}
export interface ReelsMediaFeedResponseVideoVersionsItem {
  type: number;
  width: number;
  height: number;
  url: string;
  id: string;
}
export interface ReelsMediaFeedResponseReelMentionsItem {
  x: string;
  y: string;
  z: number;
  width: string;
  height: string;
  rotation: number;
  is_pinned: number;
  is_hidden: number;
  user: ReelsMediaFeedResponseUser;
}
export interface ReelsMediaFeedResponseStoryCtaItem {
  links: ReelsMediaFeedResponseLinksItem[];
}
export interface ReelsMediaFeedResponseLinksItem {
  linkType: number;
  webUri: string;
  androidClass: string;
  package: string;
  deeplinkUri: string;
  callToActionTitle: string;
  redirectUri: null;
  leadGenFormId: string;
  igUserId: string;
  appInstallObjectiveInvalidationBehavior: null;
}

export interface StoryPollResponseItem extends ReelsMediaFeedResponseReelMentionsItem {
  is_sticker: number;
  poll_sticker: PollStickerResponseItem;
}

export interface PollStickerResponseItem {
  is_shared_result: boolean;
  poll_id: string;
  promotion_tallies: any;
  question: string;
  viewer_can_vote: boolean;
  tallies: TalliesPollStickerResponseItem[];
}

export interface TalliesPollStickerResponseItem {
  count: number;
  font_size?: number;
  text: string;
}

export interface SliderStickerResponseItem {
  slider_id: string;
  slider_vote_average: any;
  slider_vote_count: number;
  text_color: string;
  viewer_can_vote: boolean;
}

export interface StorySlidersrResponseItem extends ReelsMediaFeedResponseReelMentionsItem {
  is_sticker: number;
  slider_sticker: SliderStickerResponseItem;
}

export interface StoryQuizsResponseItem extends ReelsMediaFeedResponseReelMentionsItem {
  is_sticker: number;
  quiz_sticker: QuizStickerResponseItem;
}

export interface QuizStickerResponseItem {
  correct_answer: number;
  end_background_color: string;
  finished: boolean;
  id: string;
  question: string;
  quiz_id: string;
  start_background_color: string;
  tallies: TalliesPollStickerResponseItem[];
}
