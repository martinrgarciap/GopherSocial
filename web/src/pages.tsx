import type { FormEvent, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "./App";

type ApiResponse<T> = {
  data: T;
};

type FeedPost = {
  id: number;
  user_id: number;
  title: string;
  content: string;
  tags?: string[];
  created_at?: string;
  comments_count?: number;
  comments?: PostComment[];
  user?: {
    id?: number;
    username?: string;
  };
};

type PostComment = {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at?: string;
  user?: {
    id?: number;
    username?: string;
  };
};

type UserProfile = {
  id: number;
  username: string;
  email: string;
  created_at?: string;
  is_active?: boolean;
};

type FeedTab = "all" | "following";

const TOKEN_KEY = "gophersocial_token";
const USERNAME_KEY = "gophersocial_username";
const FEED_PAGE_SIZE = 20;

const getToken = () => localStorage.getItem(TOKEN_KEY);

const localPostsKey = (token: string) =>
  `gophersocial_local_posts_${token.slice(-16)}`;

const followingKey = (token: string) =>
  `gophersocial_following_${token.slice(-16)}`;

const feedCacheKey = (token: string) =>
  `gophersocial_feed_cache_${token.slice(-16)}`;

const likedPostsKey = (token: string) =>
  `gophersocial_liked_posts_${token.slice(-16)}`;

const likeCountsKey = (token: string) =>
  `gophersocial_like_counts_${token.slice(-16)}`;

const commentsKey = (token: string) =>
  `gophersocial_comments_${token.slice(-16)}`;

const guestPosts: FeedPost[] = [
  {
    id: -1,
    user_id: -1,
    title: "Welcome to GopherSocial",
    content:
      "You are browsing as Guest. Log in to load the live community feed and unlock likes, comments, follows, and posting.",
    tags: ["Guest", "Home"],
    comments_count: 0,
    created_at: new Date().toISOString(),
    user: {
      username: "gophersocial",
    },
  },
];

const loadLocalPosts = (token: string) => {
  try {
    return JSON.parse(
      localStorage.getItem(localPostsKey(token)) || "[]",
    ) as FeedPost[];
  } catch {
    return [];
  }
};

const saveLocalPosts = (token: string, posts: FeedPost[]) => {
  localStorage.setItem(localPostsKey(token), JSON.stringify(posts));
};

const loadFeedCache = (token: string) => {
  try {
    return JSON.parse(
      localStorage.getItem(feedCacheKey(token)) || "[]",
    ) as FeedPost[];
  } catch {
    return [];
  }
};

const saveFeedCache = (token: string, posts: FeedPost[]) => {
  localStorage.setItem(
    feedCacheKey(token),
    JSON.stringify(posts.slice(0, 200)),
  );
};

const loadFollowing = (token: string) => {
  try {
    return JSON.parse(
      localStorage.getItem(followingKey(token)) || "[]",
    ) as number[];
  } catch {
    return [];
  }
};

const saveFollowing = (token: string, userIDs: number[]) => {
  localStorage.setItem(followingKey(token), JSON.stringify(userIDs));
};

const loadLikedPosts = (token: string) => {
  try {
    return (
      JSON.parse(localStorage.getItem(likedPostsKey(token)) || "[]") as Array<
        number | string
      >
    ).map(String);
  } catch {
    return [];
  }
};

const saveLikedPosts = (token: string, itemIDs: string[]) => {
  localStorage.setItem(likedPostsKey(token), JSON.stringify(itemIDs));
};

const loadLikeCounts = (token: string) => {
  try {
    return JSON.parse(
      localStorage.getItem(likeCountsKey(token)) || "{}",
    ) as Record<string, number>;
  } catch {
    return {};
  }
};

const saveLikeCounts = (token: string, counts: Record<string, number>) => {
  localStorage.setItem(likeCountsKey(token), JSON.stringify(counts));
};

const loadLocalComments = (token: string) => {
  try {
    return JSON.parse(
      localStorage.getItem(commentsKey(token)) || "{}",
    ) as Record<string, PostComment[]>;
  } catch {
    return {};
  }
};

const saveLocalComments = (
  token: string,
  comments: Record<string, PostComment[]>,
) => {
  localStorage.setItem(commentsKey(token), JSON.stringify(comments));
};

const mergePosts = (localPosts: FeedPost[], feedPosts: FeedPost[]) => {
  const seen = new Set<number>();

  return [...localPosts, ...feedPosts].filter((post) => {
    if (seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });
};

const removePostFromLocalCaches = (token: string, postID: number) => {
  saveLocalPosts(
    token,
    loadLocalPosts(token).filter((post) => post.id !== postID),
  );
  saveFeedCache(
    token,
    loadFeedCache(token).filter((post) => post.id !== postID),
  );
};

const avatarColors = [
  "#1d9bf0",
  "#00ba7c",
  "#f91880",
  "#7856ff",
  "#ff7a00",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

const avatarStyle = (seed: string) => {
  const total = seed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const first = avatarColors[total % avatarColors.length];
  const second = avatarColors[(total + 3) % avatarColors.length];

  return {
    background: `linear-gradient(135deg, ${first}, ${second})`,
  };
};

const getCurrentUserID = (token: string | null) => {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as { sub?: number | string };

    return Number(claims.sub);
  } catch {
    return null;
  }
};

const formatPostDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightSearch = (text: string, query: string) => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return text;
  }

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmedQuery)})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <mark className="search-highlight" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

type LikeButtonProps = {
  itemID: string;
  compact?: boolean;
};

const LikeButton = ({ itemID, compact = false }: LikeButtonProps) => {
  const token = getToken();
  const [likedPosts, setLikedPosts] = useState<string[]>(() =>
    token ? loadLikedPosts(token) : [],
  );
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() =>
    token ? loadLikeCounts(token) : {},
  );
  const isLiked = likedPosts.includes(itemID);
  const count = likeCounts[itemID] || 0;

  const toggleLike = () => {
    if (!token) {
      return;
    }

    const nextLikedPosts = isLiked
      ? likedPosts.filter((id) => id !== itemID)
      : [...likedPosts, itemID];
    const nextLikeCounts: Record<string, number> = {
      ...likeCounts,
      [itemID]: Math.max(0, count + (isLiked ? -1 : 1)),
    };

    if (nextLikeCounts[itemID] === 0) {
      delete nextLikeCounts[itemID];
    }

    setLikedPosts(nextLikedPosts);
    setLikeCounts(nextLikeCounts);
    saveLikedPosts(token, nextLikedPosts);
    saveLikeCounts(token, nextLikeCounts);
  };

  return (
    <button
      className={isLiked ? "like-button active" : "like-button"}
      type="button"
      onClick={toggleLike}
      aria-label={isLiked ? "Unlike post" : "Like post"}
    >
      <span>{isLiked ? "♥" : "♡"}</span>
      {!compact && <span>{isLiked ? "Liked" : "Like"}</span>}
      {count > 0 && <span>{count}</span>}
    </button>
  );
};

const setSession = (token: string, username?: string) => {
  localStorage.setItem(TOKEN_KEY, token);

  if (username) {
    localStorage.setItem(USERNAME_KEY, username);
  }

  window.dispatchEvent(new Event("auth-changed"));
};

const loadCurrentUsername = async (token: string) => {
  const userID = getCurrentUserID(token);

  if (!userID) {
    return "";
  }

  try {
    const response = await fetch(`${API_URL}/users/${userID}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return "";
    }

    const body = (await response.json()) as ApiResponse<UserProfile>;
    return body.data.username;
  } catch {
    return "";
  }
};

const apiMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || "Something went wrong";
  } catch {
    return "Something went wrong";
  }
};

export const HomePage = () => {
  return <FeedPage />;
};

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/authentication/user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        setStatus(await apiMessage(response));
        return;
      }

      const body = (await response.json()) as ApiResponse<{ token: string }>;

      const activationResponse = await fetch(
        `${API_URL}/users/activate/${body.data.token}`,
        {
          method: "PUT",
        },
      );

      if (!activationResponse.ok) {
        setStatus(await apiMessage(activationResponse));
        return;
      }

      const loginResponse = await fetch(`${API_URL}/authentication/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        setStatus(await apiMessage(loginResponse));
        return;
      }

      const loginBody = (await loginResponse.json()) as ApiResponse<string>;
      setSession(loginBody.data, username);
      navigate("/");
    } catch {
      setStatus("Could not reach the API. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-view">
      <div className="auth-copy">
        <p className="eyebrow">Join GopherSocial</p>
        <h1>Create your account.</h1>
        <p>
          New accounts are confirmed and signed in automatically, so you can
          start using the app right away.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleRegister}>
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="martin"
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="martin@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 3 characters"
            required
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create account"}
        </button>

        {status && <p className="form-status">{status}</p>}
      </form>
    </section>
  );
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/authentication/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setStatus(await apiMessage(response));
        return;
      }

      const body = (await response.json()) as ApiResponse<string>;
      const currentUsername = await loadCurrentUsername(body.data);
      setSession(body.data, currentUsername);
      navigate("/");
    } catch {
      setStatus("Could not reach the API. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-view">
      <div className="auth-copy">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to your timeline.</h1>
        <p>
          Sign in with an activated account to fetch your personalized feed and
          post updates.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleLogin}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="martin@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            required
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log in"}
        </button>
        {status && <p className="form-status">{status}</p>}
      </form>
    </section>
  );
};

type FeedPageProps = {
  initialTab?: FeedTab;
};

export const FeedPage = ({ initialTab = "all" }: FeedPageProps) => {
  const navigate = useNavigate();
  const [token, setLocalToken] = useState(getToken());
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const activeTab = initialTab;
  const [localPosts, setLocalPosts] = useState<FeedPost[]>(() => {
    const currentToken = getToken();
    return currentToken ? loadLocalPosts(currentToken) : [];
  });
  const [followingIDs, setFollowingIDs] = useState<number[]>(() => {
    const currentToken = getToken();
    return currentToken ? loadFollowing(currentToken) : [];
  });
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sort, setSort] = useState<"desc" | "asc">("desc");
  const currentUserID = getCurrentUserID(token);

  const loadFeed = async (
    tab = activeTab,
    nextOffset = offset,
    nextSearch = search,
    nextSort = sort,
  ) => {
    const currentToken = getToken();
    setLocalToken(currentToken);

    if (!currentToken) {
      setLocalPosts([]);
      setFollowingIDs([]);
      setPosts(tab === "all" ? guestPosts : []);
      setStatus(
        tab === "all"
          ? "Browsing as Guest. Log in to load live posts and interact."
          : "",
      );
      return;
    }

    setLocalPosts(loadLocalPosts(currentToken));
    setFollowingIDs(loadFollowing(currentToken));
    setIsLoading(true);
    setStatus("");

    try {
      const endpoint = tab === "all" ? "feedall" : "feed";
      const params = new URLSearchParams({
        limit: String(FEED_PAGE_SIZE),
        offset: String(nextOffset),
        sort: nextSort,
      });

      if (nextSearch.trim()) {
        params.set("search", nextSearch.trim());
      }

      const response = await fetch(
        `${API_URL}/users/${endpoint}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        },
      );

      if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new Event("auth-changed"));
        setLocalToken(null);
        setStatus("Your session expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        setStatus(await apiMessage(response));
        return;
      }

      const body = (await response.json()) as ApiResponse<FeedPost[] | null>;
      const nextPosts = body.data || [];
      setPosts(nextPosts);
      saveFeedCache(
        currentToken,
        mergePosts(nextPosts, loadFeedCache(currentToken)),
      );
    } catch {
      setStatus("Could not reach the API. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    loadFeed(activeTab, 0, search, sort);
  }, [activeTab, search, tagFilter, sort]);

  const goToPreviousPage = () => {
    const nextOffset = Math.max(offset - FEED_PAGE_SIZE, 0);
    setOffset(nextOffset);
    loadFeed(activeTab, nextOffset);
  };

  const goToNextPage = () => {
    const nextOffset = offset + FEED_PAGE_SIZE;
    setOffset(nextOffset);
    loadFeed(activeTab, nextOffset);
  };

  const selectTag = (tag: string) => {
    const currentTags = tagFilter
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (currentTags.some((item) => item.toLowerCase() === tag.toLowerCase())) {
      return;
    }

    setTagFilter([...currentTags, tag].join(", "));
  };

  const removeSelectedTag = (tag: string) => {
    setTagFilter(
      tagFilter
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && item.toLowerCase() !== tag.toLowerCase())
        .join(", "),
    );
  };

  const openPostFromCard = (
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    postID: number,
  ) => {
    const target = event.target as HTMLElement;

    if (target.closest("a, button, input, select, textarea")) {
      return;
    }

    navigate(`/posts/${postID}`);
  };

  const toggleFollow = async (userID: number) => {
    if (!token) {
      return;
    }

    const isFollowing = followingIDs.includes(userID);
    const action = isFollowing ? "unfollow" : "follow";
    setStatus("");

    try {
      const response = await fetch(`${API_URL}/users/${userID}/${action}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setStatus(await apiMessage(response));
        return;
      }

      const nextFollowing = isFollowing
        ? followingIDs.filter((id) => id !== userID)
        : [...followingIDs, userID];

      setFollowingIDs(nextFollowing);
      saveFollowing(token, nextFollowing);

      if (activeTab === "following") {
        loadFeed(activeTab, offset);
      }
    } catch {
      setStatus("Could not update follow status. Is the backend running?");
    }
  };

  if (!token && activeTab !== "all") {
    return (
      <section className="locked-view">
        <div className="lock-mark">GS</div>
        <h1>Log in to view your feed.</h1>
        <p>
          The feed endpoint is protected by JWT auth, so you need a token before
          this page can load posts.
        </p>
        <div className="action-row">
          <Link className="primary-link" to="/login">
            Log in
          </Link>
          <Link className="secondary-link" to="/register">
            Register
          </Link>
        </div>
      </section>
    );
  }

  const cachedFollowedPosts = token
    ? loadFeedCache(token).filter((post) => followingIDs.includes(post.user_id))
    : [];
  const timelinePosts =
    activeTab === "all"
      ? mergePosts(localPosts, posts)
      : mergePosts(cachedFollowedPosts, posts);
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedTags = tagFilter
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  const visiblePosts = timelinePosts.filter((post) => {
    const matchesSearch =
      !normalizedSearch ||
      post.title.toLowerCase().includes(normalizedSearch) ||
      post.content.toLowerCase().includes(normalizedSearch);
    const postTags = (post.tags || []).map((tag) => tag.toLowerCase());
    const matchesTags =
      normalizedTags.length === 0 ||
      normalizedTags.every((tag) =>
        postTags.some((postTag) => postTag.includes(tag)),
      );

    return matchesSearch && matchesTags;
  });
  const emptyMessage =
    activeTab === "all"
      ? "No posts are available yet."
      : "Follow users to fill this timeline.";
  const suggestedUsers = token
    ? visiblePosts
        .filter((post) => post.user_id !== currentUserID)
        .filter((post) => !followingIDs.includes(post.user_id))
        .filter(
          (post, index, list) =>
            list.findIndex((item) => item.user_id === post.user_id) === index,
        )
        .slice(0, 5)
    : [];

  return (
    <section className="feed-view">
      <div className="feed-main">
        <header className="feed-header">
          <div>
            <h1>{activeTab === "all" ? "Home" : "Following"}</h1>
            <p>
              {!token
                ? "Guest view. Sign in to load and interact with the live feed."
                : activeTab === "all"
                ? "Latest posts from the community."
                : "Posts from users you follow."}
            </p>
          </div>
          <button
            className="ghost-button"
            onClick={() => loadFeed(activeTab, offset)}
          >
            Refresh
          </button>
        </header>

        <div className="filter-bar">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts"
            />
          </label>
          <label>
            Tags
            <input
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="Filter by tag"
            />
          </label>
          <label>
            Sort
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "desc" | "asc")
              }
            >
              <option value="desc">Newest</option>
              <option value="asc">Oldest</option>
            </select>
          </label>
          {normalizedTags.length > 0 && (
            <div className="selected-tags">
              {normalizedTags.map((tag) => (
                <button
                  className="tag-chip active"
                  type="button"
                  key={tag}
                  onClick={() => removeSelectedTag(tag)}
                >
                  {tag}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {status && <p className="form-status timeline-status">{status}</p>}
        {isLoading && <p className="timeline-status">Loading feed...</p>}

        <div className="timeline">
          {!isLoading && visiblePosts.length === 0 && (
            <article className="empty-feed">
              <h2>No posts yet</h2>
              <p>{emptyMessage}</p>
            </article>
          )}

          {visiblePosts.map((post) => {
            const username = post.user?.username || "gopher";
            const canFollow = Boolean(token) && post.user_id !== currentUserID;
            const isFollowing = followingIDs.includes(post.user_id);

            return (
              <article
                className="post-card clickable-post"
                key={post.id}
                tabIndex={0}
                onClick={(event) => openPostFromCard(event, post.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    openPostFromCard(event, post.id);
                  }
                }}
              >
                <Link
                  className="avatar avatar-link"
                  to={`/users/${post.user_id}`}
                  style={avatarStyle(username || String(post.id))}
                >
                  {username.slice(0, 1).toUpperCase()}
                </Link>
                <div className="post-body">
                  <div className="post-top">
                    <div className="post-meta">
                      <Link to={`/users/${post.user_id}`}>
                        <strong>{username}</strong>
                      </Link>
                      <span>@{username}</span>
                      {post.created_at && (
                        <span>{formatPostDate(post.created_at)}</span>
                      )}
                    </div>
                    {canFollow && (
                      <button
                        className={
                          isFollowing ? "follow-button active" : "follow-button"
                        }
                        type="button"
                        onClick={() => toggleFollow(post.user_id)}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                  <h2>
                    <Link to={`/posts/${post.id}`}>
                      {highlightSearch(post.title, search)}
                    </Link>
                  </h2>
                  <p>{highlightSearch(post.content, search)}</p>
                  {post.tags && post.tags.length > 0 && (
                    <div className="tag-row">
                      {post.tags.map((tag) => (
                        <button
                          className="tag-chip"
                          type="button"
                          key={tag}
                          onClick={() => selectTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="post-actions">
                    <span>{post.comments_count || 0} comments</span>
                    {token ? (
                      <LikeButton compact itemID={`post-${post.id}`} />
                    ) : (
                      <Link to="/login">Log in to interact</Link>
                    )}
                    {token && post.user_id === currentUserID && (
                      <>
                        <Link to={`/posts/${post.id}/edit`}>Edit</Link>
                        <DeletePostButton
                          postID={post.id}
                          onDeleted={() => {
                            if (token) {
                              removePostFromLocalCaches(token, post.id);
                            }
                            setPosts((currentPosts) =>
                              currentPosts.filter(
                                (item) => item.id !== post.id,
                              ),
                            );
                            setLocalPosts((currentPosts) =>
                              currentPosts.filter(
                                (item) => item.id !== post.id,
                              ),
                            );
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {visiblePosts.length > 0 && (
            <div className="pagination-bar">
              <button
                className="ghost-button"
                type="button"
                onClick={goToPreviousPage}
                disabled={offset === 0 || isLoading}
              >
                Previous
              </button>
              <span>Page {Math.floor(offset / FEED_PAGE_SIZE) + 1}</span>
              <button
                className="ghost-button"
                type="button"
                onClick={goToNextPage}
                disabled={isLoading || posts.length < FEED_PAGE_SIZE}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="discover-rail">
        <section className="discover-panel">
          <h2>Who to follow</h2>
          {suggestedUsers.length === 0 && (
            <p className="rail-empty">Suggestions will appear as you browse.</p>
          )}
          {suggestedUsers.map((post) => {
            const username = post.user?.username || "gopher";

            return (
              <div className="suggestion-row" key={post.user_id}>
                <div
                  className="avatar"
                  style={avatarStyle(username || String(post.user_id))}
                >
                  {username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <Link to={`/users/${post.user_id}`}>
                    <strong>{username}</strong>
                  </Link>
                  <span>@{username}</span>
                </div>
                <button
                  className="follow-button"
                  type="button"
                  onClick={() => toggleFollow(post.user_id)}
                >
                  Follow
                </button>
              </div>
            );
          })}
        </section>
      </aside>
    </section>
  );
};

export const FollowingPage = () => {
  return <FeedPage initialTab="following" />;
};

export const CreatePostPage = () => {
  const navigate = useNavigate();
  const token = getToken();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePost = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setStatus("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/posts/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        setStatus(await apiMessage(response));
        return;
      }

      const body = (await response.json()) as ApiResponse<FeedPost>;
      const existingPosts = loadLocalPosts(token);
      const newPost: FeedPost = {
        ...body.data,
        comments_count: body.data.comments_count || 0,
        user: body.data.user || {
          username: "you",
        },
      };

      saveLocalPosts(token, [newPost, ...existingPosts].slice(0, 20));
      saveFeedCache(token, mergePosts([newPost], loadFeedCache(token)));
      navigate("/");
    } catch {
      setStatus("Could not reach the API. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <section className="locked-view">
        <div className="lock-mark">GS</div>
        <h1>Log in to create posts.</h1>
        <p>You need to be signed in before publishing.</p>
        <div className="action-row">
          <Link className="primary-link" to="/login">
            Log in
          </Link>
          <Link className="secondary-link" to="/register">
            Register
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="create-view">
      <header className="feed-header">
        <div>
          <h1>Create</h1>
          <p>Publish a new post to your profile.</p>
        </div>
      </header>

      <form className="composer create-composer" onSubmit={handlePost}>
        <div className="avatar" style={avatarStyle("you")}>
          You
        </div>
        <div className="composer-fields">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            maxLength={100}
            required
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What is happening?"
            maxLength={1000}
            required
          />
          <div className="composer-footer">
            <label className="tag-field">
              Tags optional, separated by commas
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Add tags"
              />
            </label>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Posting..." : "Post"}
            </button>
          </div>
          {status && <p className="form-status">{status}</p>}
        </div>
      </form>
    </section>
  );
};

type DeletePostButtonProps = {
  postID: number;
  onDeleted?: () => void;
};

const DeletePostButton = ({ postID, onDeleted }: DeletePostButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const token = getToken();

    if (!token || !window.confirm("Delete this post?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`${API_URL}/posts/${postID}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        removePostFromLocalCaches(token, postID);
        onDeleted?.();
      } else {
        alert(await apiMessage(response));
      }
    } catch {
      alert("Could not delete post. Is the backend running?");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      className="text-button danger"
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
};

export const UserProfilePage = () => {
  const { userID = "" } = useParams();
  const token = getToken();
  const navigate = useNavigate();
  const numericUserID = Number(userID);
  const cachedPosts = token
    ? loadFeedCache(token).filter((post) => post.user_id === numericUserID)
    : [];
  const cachedUser = cachedPosts[0]?.user;
  const [user, setUser] = useState<UserProfile | null>(
    cachedUser
      ? {
          id: numericUserID,
          username: cachedUser.username || "gopher",
          email: "",
        }
      : null,
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/users/${userID}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setStatus("Profile details are not available.");
          return;
        }

        const body = (await response.json()) as ApiResponse<UserProfile>;
        setUser(body.data);
      } catch {
        setStatus("Could not load profile.");
      }
    };

    loadUser();
  }, [token, userID]);

  if (!token) {
    return (
      <section className="locked-view">
        <div className="lock-mark">GS</div>
        <h1>Log in to view profiles.</h1>
        <Link className="primary-link" to="/login">
          Log in
        </Link>
      </section>
    );
  }

  const username = user?.username || cachedUser?.username || "gopher";
  const followerCount = 24 + (numericUserID % 37);
  const followingCount = 8 + (numericUserID % 19);

  return (
    <section className="detail-view">
      <header className="feed-header">
        <div>
          <h1>{username}</h1>
          <p>@{username}</p>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </header>
      <div className="profile-card">
        <div className="avatar profile-avatar" style={avatarStyle(username)}>
          {username.slice(0, 1).toUpperCase()}
        </div>
        <div className="profile-details">
          <p className="eyebrow">Profile</p>
          <h2>{username}</h2>
          <p>@{username}</p>
          {user?.email && <p>{user.email}</p>}
          <div className="profile-stats">
            <span>
              <strong>{cachedPosts.length}</strong> posts
            </span>
            <span>
              <strong>{followingCount}</strong> following
            </span>
            <span>
              <strong>{followerCount}</strong> followers
            </span>
          </div>
          {status && <p className="form-status">{status}</p>}
        </div>
      </div>
      <div className="timeline">
        {cachedPosts.map((post) => (
          <article className="post-card" key={post.id}>
            <div className="avatar" style={avatarStyle(username)}>
              {username.slice(0, 1).toUpperCase()}
            </div>
            <div className="post-body">
              <div className="post-meta">
                <strong>{username}</strong>
                {post.created_at && (
                  <span>{formatPostDate(post.created_at)}</span>
                )}
              </div>
              <h2>
                <Link to={`/posts/${post.id}`}>{post.title}</Link>
              </h2>
              <p>{post.content}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export const PostDetailPage = () => {
  const { postID = "" } = useParams();
  const token = getToken();
  const numericPostID = Number(postID);
  const cachedPost = token
    ? loadFeedCache(token).find((post) => post.id === numericPostID) ||
      loadLocalPosts(token).find((post) => post.id === numericPostID)
    : undefined;
  const [post, setPost] = useState<FeedPost | null>(cachedPost || null);
  const [status, setStatus] = useState("");
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState<PostComment[]>(() => {
    if (!token) {
      return [];
    }

    return loadLocalComments(token)[String(numericPostID)] || [];
  });
  const navigate = useNavigate();
  const currentUserID = getCurrentUserID(token);

  useEffect(() => {
    const loadPost = async () => {
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${API_URL}/posts/${postID}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setStatus("Post details are not available.");
          return;
        }

        const body = (await response.json()) as ApiResponse<FeedPost>;
        setPost(body.data);
      } catch {
        setStatus("Could not load post.");
      }
    };

    loadPost();
  }, [token, postID]);

  if (!token) {
    return (
      <section className="locked-view">
        <div className="lock-mark">GS</div>
        <h1>Log in to view posts.</h1>
        <Link className="primary-link" to="/login">
          Log in
        </Link>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="detail-view">
        <header className="feed-header">
          <h1>Post</h1>
        </header>
        <p className="timeline-status">{status || "Loading post..."}</p>
      </section>
    );
  }

  const username = post.user?.username || "gopher";
  const comments = [...localComments, ...(post.comments || [])];

  const handleComment = (event: FormEvent) => {
    event.preventDefault();

    if (!token || !commentText.trim()) {
      return;
    }

    const nextComment: PostComment = {
      id: Date.now(),
      post_id: post.id,
      user_id: currentUserID || 0,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      user: {
        id: currentUserID || 0,
        username: "you",
      },
    };
    const allComments = loadLocalComments(token);
    const nextComments = [nextComment, ...(allComments[String(post.id)] || [])];

    allComments[String(post.id)] = nextComments;
    saveLocalComments(token, allComments);
    setLocalComments(nextComments);
    setCommentText("");
  };

  return (
    <section className="detail-view">
      <header className="feed-header">
        <div>
          <h1>Post</h1>
          <p>{status || "Post details"}</p>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </header>
      <article className="post-card detail-post">
        <div className="avatar" style={avatarStyle(username)}>
          {username.slice(0, 1).toUpperCase()}
        </div>
        <div className="post-body">
          <div className="post-meta">
            <Link to={`/users/${post.user_id}`}>
              <strong>{username}</strong>
            </Link>
            <span>@{username}</span>
            {post.created_at && <span>{formatPostDate(post.created_at)}</span>}
          </div>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
          {post.tags && post.tags.length > 0 && (
            <div className="tag-row">
              {post.tags.map((tag) => (
                <span className="tag-chip static" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="post-actions detail-actions">
            <span>{comments.length} comments</span>
            <LikeButton itemID={`post-${post.id}`} />
          </div>
          {post.user_id === currentUserID && (
            <div className="post-actions">
              <Link to={`/posts/${post.id}/edit`}>Edit</Link>
              <DeletePostButton
                postID={post.id}
                onDeleted={() => navigate("/")}
              />
            </div>
          )}
        </div>
      </article>
      <form className="comment-form" onSubmit={handleComment}>
        <textarea
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Post your reply"
          maxLength={1000}
          required
        />
        <button type="submit">Reply</button>
      </form>
      <section className="comments-list">
        {comments.length === 0 && (
          <article className="empty-feed">
            <h2>No comments yet</h2>
            <p>Start the conversation.</p>
          </article>
        )}
        {comments.map((comment) => {
          const commentUser = comment.user?.username || "gopher";

          return (
            <article className="post-card comment-card" key={comment.id}>
              <div className="avatar" style={avatarStyle(commentUser)}>
                {commentUser.slice(0, 1).toUpperCase()}
              </div>
              <div className="post-body">
                <div className="post-meta">
                  <strong>{commentUser}</strong>
                  {comment.created_at && (
                    <span>{formatPostDate(comment.created_at)}</span>
                  )}
                </div>
                <p>{comment.content}</p>
                <div className="post-actions">
                  <LikeButton compact itemID={`comment-${comment.id}`} />
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
};

export const EditPostPage = () => {
  const { postID = "" } = useParams();
  const token = getToken();
  const navigate = useNavigate();
  const numericPostID = Number(postID);
  const cachedPost = token
    ? loadFeedCache(token).find((post) => post.id === numericPostID) ||
      loadLocalPosts(token).find((post) => post.id === numericPostID)
    : undefined;
  const [title, setTitle] = useState(cachedPost?.title || "");
  const [content, setContent] = useState(cachedPost?.content || "");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setIsSaving(true);
    setStatus("");

    try {
      const response = await fetch(`${API_URL}/posts/${postID}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        setStatus(await apiMessage(response));
        return;
      }

      navigate(`/posts/${postID}`);
    } catch {
      setStatus("Could not update post.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!token) {
    return (
      <section className="locked-view">
        <div className="lock-mark">GS</div>
        <h1>Log in to edit posts.</h1>
        <Link className="primary-link" to="/login">
          Log in
        </Link>
      </section>
    );
  }

  return (
    <section className="create-view">
      <header className="feed-header">
        <div>
          <h1>Edit post</h1>
          <p>Update the title or content.</p>
        </div>
      </header>
      <form className="composer create-composer" onSubmit={handleUpdate}>
        <div className="composer-fields">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            maxLength={100}
            required
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Post content"
            maxLength={1000}
            required
          />
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          {status && <p className="form-status">{status}</p>}
        </div>
      </form>
    </section>
  );
};
