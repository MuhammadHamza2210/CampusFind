import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Tag,
  BadgeCheck,
  ImageOff,
  MessageCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  Flag,
  ArrowLeft,
  Send,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Fingerprint,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, parseError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import type { Listing, Comment, MatchListing, Claim, ClaimStatus } from '@/types';
import { TYPE_META, categoryLabel, locationLabel } from '@/lib/constants';
import { formatPrice, formatDate, timeAgo } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageLoader } from '@/components/ui/Spinner';
import { ListingCard } from '@/components/listings/ListingCard';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [matches, setMatches] = useState<MatchListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);

  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contacting, setContacting] = useState(false);

  // Ownership-claim state (found items).
  const [claims, setClaims] = useState<Claim[]>([]); // finder's view
  const [myClaim, setMyClaim] = useState<Claim | null>(null); // claimant's view
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimAnswer, setClaimAnswer] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMatches([]);
    Promise.all([
      api.get<{ listing: Listing }>(`/api/listings/${id}`),
      api.get<{ items: Comment[] }>(`/api/listings/${id}/comments`),
    ])
      .then(([l, c]) => {
        setListing(l.data.listing);
        setComments(c.data.items);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch complementary lost↔found candidates (never for `sell` listings).
  useEffect(() => {
    if (!id || !listing || listing.type === 'sell') return;
    let cancelled = false;
    api
      .get<{ items: MatchListing[] }>(`/api/listings/${id}/matches`)
      .then(({ data }) => {
        if (!cancelled) setMatches(data.items);
      })
      .catch(() => {
        /* matches are a bonus — ignore failures */
      });
    return () => {
      cancelled = true;
    };
  }, [id, listing]);

  // Load ownership claims for found items: the finder sees every claim, a
  // potential claimant sees only their own.
  const loadClaimData = useCallback(async () => {
    if (!id || !user || !listing || listing.type !== 'found') return;
    try {
      if (user.id === listing.owner.id) {
        const { data } = await api.get<{ items: Claim[] }>(
          `/api/listings/${id}/claims`
        );
        setClaims(data.items);
      } else {
        const { data } = await api.get<{ items: Claim[] }>('/api/claims/mine');
        setMyClaim(data.items.find((c) => c.listing.id === id) ?? null);
      }
    } catch {
      /* ignore */
    }
  }, [id, user, listing]);

  useEffect(() => {
    loadClaimData();
  }, [loadClaimData]);

  // Realtime: when a claim on THIS listing is created/approved/rejected, the
  // server pushes `alert:new` to the affected user. Re-fetch claims and the
  // listing (its status may have flipped to resolved) so nothing needs a reload.
  useEffect(() => {
    if (!id || !user || !listing || listing.type !== 'found') return;
    const socket = getSocket();
    const onAlert = (payload?: { type?: string; listingId?: string }) => {
      if (String(payload?.listingId) !== id) return;
      loadClaimData();
      api
        .get<{ listing: Listing }>(`/api/listings/${id}`)
        .then(({ data }) => setListing(data.listing))
        .catch(() => {});
    };
    socket.on('alert:new', onAlert);
    return () => {
      socket.off('alert:new', onAlert);
    };
  }, [id, user, listing, loadClaimData]);

  // Polling fallback: keep claim state fresh even if the WebSocket is blocked.
  useEffect(() => {
    if (!id || !user || !listing || listing.type !== 'found') return;
    const interval = setInterval(loadClaimData, 5000);
    return () => clearInterval(interval);
  }, [id, user, listing, loadClaimData]);

  // Live-refresh the public comment thread so replies appear without a reload.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get<{ items: Comment[] }>(
          `/api/listings/${id}/comments`
        );
        if (!cancelled) setComments(data.items);
      } catch {
        /* ignore transient errors */
      }
    };
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) return <FullPageLoader />;
  if (notFound || !listing)
    return (
      <EmptyState
        icon={ImageOff}
        title="Listing not found"
        description="It may have been removed or resolved."
        action={
          <Link to="/" className="btn-primary">
            Back to browse
          </Link>
        }
      />
    );

  const meta = TYPE_META[listing.type];
  const isOwner = user?.id === listing.owner.id;
  const resolved = listing.status === 'resolved' || listing.status === 'sold';

  const requireAuth = () => {
    if (!user) {
      toast('Please log in to continue');
      navigate('/login', { state: { from: `/listings/${id}` } });
      return false;
    }
    return true;
  };

  const startChat = async () => {
    if (!requireAuth()) return;
    setContacting(true);
    try {
      const { data } = await api.post('/api/conversations', { listingId: id });
      navigate(`/messages/${data.conversation._id}`);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setContacting(false);
    }
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!commentBody.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post<{ comment: Comment }>(
        `/api/listings/${id}/comments`,
        { body: commentBody.trim() }
      );
      setComments((c) => [...c, data.comment]);
      setCommentBody('');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setPosting(false);
    }
  };

  const markResolved = async () => {
    try {
      const status = listing.type === 'sell' ? 'sold' : 'resolved';
      const { data } = await api.patch<{ listing: Listing }>(
        `/api/listings/${id}/status`,
        { status }
      );
      setListing(data.listing);
      toast.success(status === 'sold' ? 'Marked as sold' : 'Marked as resolved');
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const reopen = async () => {
    try {
      const { data } = await api.patch<{ listing: Listing }>(
        `/api/listings/${id}/status`,
        { status: 'active' }
      );
      setListing(data.listing);
      toast.success('Listing reopened');
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/api/listings/${id}`);
      toast.success('Listing deleted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const submitClaim = async () => {
    if (!requireAuth()) return;
    if (claimAnswer.trim().length < 2) {
      toast.error('Add a short proof so the finder can verify you');
      return;
    }
    setClaiming(true);
    try {
      const { data } = await api.post<{ claim: Claim }>(
        `/api/listings/${id}/claims`,
        { answer: claimAnswer.trim() }
      );
      setMyClaim(data.claim);
      setClaimOpen(false);
      setClaimAnswer('');
      toast.success('Claim sent — the finder will review it');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setClaiming(false);
    }
  };

  const decideClaim = async (claimId: string, status: 'approved' | 'rejected') => {
    setDecidingId(claimId);
    try {
      const { data } = await api.patch<{ claim: Claim }>(`/api/claims/${claimId}`, {
        status,
      });
      setClaims((prev) => {
        // Approving one auto-rejects the other pending claims server-side.
        const next = prev.map((c) =>
          c.id === claimId
            ? data.claim
            : status === 'approved' && c.status === 'pending'
            ? { ...c, status: 'rejected' as ClaimStatus }
            : c
        );
        return next;
      });
      if (status === 'approved') {
        setListing((l) => (l ? { ...l, status: 'resolved' } : l));
        toast.success('Claim approved — a chat is open to arrange pickup');
        if (data.claim.conversation) navigate(`/messages/${data.claim.conversation}`);
      } else {
        toast('Claim rejected');
      }
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setDecidingId(null);
    }
  };

  const submitFlag = async () => {
    if (!requireAuth()) return;
    try {
      await api.post(`/api/listings/${id}/flag`, { reason: flagReason || 'Spam' });
      toast.success('Reported — thanks for keeping CampusFind clean');
      setFlagOpen(false);
      setFlagReason('');
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Image */}
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-surface shadow-card">
            {listing.imageUrl ? (
              <img
                src={listing.imageUrl}
                alt={listing.title}
                className="max-h-[520px] w-full bg-gray-100 object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 text-brand-200">
                <ImageOff className="h-14 w-14" strokeWidth={1.5} />
              </div>
            )}
            {resolved && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  {listing.type === 'sell' ? 'Sold' : 'Resolved'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge className={meta.badge}>{meta.label}</Badge>
                <span className="text-xs text-gray-400">
                  {categoryLabel(listing.category)}
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">
                {listing.title}
              </h1>
              {listing.price !== null && (
                <p className="mt-1 text-2xl font-extrabold text-brand-700">
                  {formatPrice(listing.price)}
                </p>
              )}
            </div>

            <dl className="space-y-2.5 rounded-2xl border border-gray-100 bg-surface p-4 text-sm shadow-card">
              <Row icon={MapPin} label="Location" value={locationLabel(listing.location)} />
              <Row icon={Tag} label="Category" value={categoryLabel(listing.category)} />
              <Row
                icon={Calendar}
                label="Posted"
                value={`${formatDate(listing.createdAt)} · ${timeAgo(listing.createdAt)}`}
              />
            </dl>

            {/* Poster */}
            <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-surface p-4 shadow-card">
              <Avatar name={listing.owner.name} src={listing.owner.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate font-semibold text-gray-900">
                  {listing.owner.name}
                  {listing.owner.isVerified && (
                    <BadgeCheck className="h-4 w-4 text-brand-500" />
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  Member since {formatDate(listing.owner.joinedAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            {isOwner ? (
              <div className="space-y-2">
                {!resolved ? (
                  <Button fullWidth onClick={markResolved}>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as {listing.type === 'sell' ? 'sold' : 'resolved'}
                  </Button>
                ) : (
                  <Button fullWidth variant="secondary" onClick={reopen}>
                    Reopen listing
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Link to={`/listings/${id}/edit`} className="btn-secondary">
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                  <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {listing.type === 'found' ? (
                  myClaim ? (
                    <ClaimStatusCard claim={myClaim} />
                  ) : resolved ? (
                    <Button fullWidth disabled>
                      No longer available
                    </Button>
                  ) : (
                    <>
                      <Button fullWidth onClick={() => setClaimOpen(true)}>
                        <ShieldCheck className="h-4 w-4" />
                        This is mine — claim it
                      </Button>
                      <p className="text-center text-xs text-gray-400">
                        Answer a quick question so {listing.owner.name.split(' ')[0]} can
                        verify it's yours
                      </p>
                    </>
                  )
                ) : (
                  <>
                    <Button fullWidth onClick={startChat} loading={contacting} disabled={resolved}>
                      <MessageCircle className="h-4 w-4" />
                      {resolved ? 'No longer available' : meta.verb}
                    </Button>
                    {!resolved && (
                      <p className="text-center text-xs text-gray-400">
                        Opens a private chat with {listing.owner.name.split(' ')[0]}
                      </p>
                    )}
                  </>
                )}
                <button
                  onClick={() => setFlagOpen(true)}
                  className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-red-500"
                >
                  <Flag className="h-3.5 w-3.5" /> Report this listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ownership claims (finder's view) */}
      {isOwner && listing.type === 'found' && (
        <section className="mt-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Ownership claims{' '}
              <span className="text-sm font-normal text-gray-400">
                ({claims.length})
              </span>
            </h2>
          </div>
          {listing.verificationQuestion && (
            <p className="mt-1 text-sm text-gray-500">
              Your verification question:{' '}
              <span className="font-medium text-gray-700">
                “{listing.verificationQuestion}”
              </span>
            </p>
          )}
          {claims.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-surface py-8 text-center text-sm text-gray-400">
              No claims yet. When someone says this item is theirs, it shows up here.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {claims.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-gray-100 bg-surface p-4 shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={c.claimant.name} src={c.claimant.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {c.claimant.name}
                        </span>
                        {c.claimant.isVerified && (
                          <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
                        )}
                        <span className="text-xs text-gray-400">
                          {timeAgo(c.createdAt)}
                        </span>
                        <ClaimStatusBadge status={c.status} />
                      </div>
                      <p className="mt-1.5 flex gap-1.5 text-sm text-gray-600">
                        <Fingerprint className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="whitespace-pre-line break-words">{c.answer}</span>
                      </p>
                      {c.status === 'pending' && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            onClick={() => decideClaim(c.id, 'approved')}
                            loading={decidingId === c.id}
                          >
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => decideClaim(c.id, 'rejected')}
                            disabled={decidingId === c.id}
                          >
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      )}
                      {c.status === 'approved' && c.conversation && (
                        <Link
                          to={`/messages/${c.conversation}`}
                          className="btn-secondary mt-3 inline-flex"
                        >
                          <MessageCircle className="h-4 w-4" /> Open chat
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Description */}
      <section className="mt-8">
        <h2 className="text-lg font-bold text-gray-900">Description</h2>
        <p className="mt-2 whitespace-pre-line leading-relaxed text-gray-600">
          {listing.description}
        </p>
      </section>

      {/* Possible lost↔found matches */}
      {listing.type !== 'sell' && matches.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-500" />
            <h2 className="text-lg font-bold text-gray-900">Possible matches</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {listing.type === 'lost'
              ? 'Found reports that might be your item — same category, ranked by location and description.'
              : 'People looking for an item like this one — reach out if it belongs to them.'}
          </p>
          <div className="mt-4 space-y-3">
            {matches.map((m) => (
              <ListingCard key={m.id} listing={m} view="list" />
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-gray-900">
          Public comments{' '}
          <span className="text-sm font-normal text-gray-400">
            ({comments.length})
          </span>
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Anyone can see these. To talk privately, use the{' '}
          <span className="font-medium text-brand-600">{meta.verb}</span> button above.
        </p>

        <form onSubmit={addComment} className="mt-4 flex items-start gap-3">
          {user && <Avatar name={user.name} src={user.avatarUrl} size="sm" />}
          <div className="flex-1">
            <Textarea
              placeholder={
                user ? 'Ask a question or share info…' : 'Log in to comment'
              }
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              disabled={!user}
              className="min-h-[80px]"
            />
            <div className="mt-2 flex justify-end">
              <Button type="submit" loading={posting} disabled={!user || !commentBody.trim()}>
                <Send className="h-4 w-4" /> Comment
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6 space-y-4">
          {comments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 bg-surface py-8 text-center text-sm text-gray-400">
              No comments yet — start the conversation.
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.author.name} src={c.author.avatarUrl} size="sm" />
                <div className="flex-1 rounded-2xl rounded-tl-sm bg-surface border border-gray-100 px-4 py-3 shadow-card">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-900">
                      {c.author.name}
                    </span>
                    {c.author.isVerified && (
                      <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
                    )}
                    <span className="ml-1 text-xs text-gray-400">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Claim modal */}
      <Modal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        title="Claim this item"
        description="Prove it's yours so the finder can safely return it."
      >
        <div className="space-y-4">
          {listing.verificationQuestion ? (
            <div className="rounded-xl bg-brand-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                <Fingerprint className="h-3.5 w-3.5" /> Verification question
              </p>
              <p className="mt-1 text-sm font-medium text-brand-900">
                {listing.verificationQuestion}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Describe a detail only the owner would know — distinguishing marks,
              what's inside, or exactly where and when you lost it.
            </p>
          )}
          <Textarea
            label="Your answer"
            placeholder="Give the finder enough to confirm it's really yours…"
            value={claimAnswer}
            onChange={(e) => setClaimAnswer(e.target.value)}
            className="min-h-[100px]"
            maxLength={1000}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setClaimOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitClaim} loading={claiming}>
              <ShieldCheck className="h-4 w-4" /> Submit claim
            </Button>
          </div>
        </div>
      </Modal>

      {/* Flag modal */}
      <Modal
        open={flagOpen}
        onClose={() => setFlagOpen(false)}
        title="Report listing"
        description="Tell us what's wrong. A moderator will review it."
      >
        <div className="space-y-4">
          <Input
            label="Reason"
            placeholder="e.g. spam, scam, inappropriate"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFlagOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitFlag}>
              <ShieldAlert className="h-4 w-4" /> Submit report
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this listing?"
        description="This can't be undone. The listing and its image will be permanently removed."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove}>
            <Trash2 className="h-4 w-4" /> Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const styles: Record<ClaimStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-gray-100 text-gray-500',
  };
  const label = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[
    status
  ];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[status]}`}
    >
      {label}
    </span>
  );
}

function ClaimStatusCard({ claim }: { claim: Claim }) {
  if (claim.status === 'approved') {
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Claim approved
          </p>
          <p className="mt-0.5 text-emerald-700">
            The finder approved your claim. Arrange a pickup in chat.
          </p>
        </div>
        {claim.conversation && (
          <Link to={`/messages/${claim.conversation}`} className="btn-primary w-full">
            <MessageCircle className="h-4 w-4" /> Go to chat
          </Link>
        )}
      </div>
    );
  }
  if (claim.status === 'rejected') {
    return (
      <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
        <p className="font-semibold text-gray-700">Claim not approved</p>
        <p className="mt-0.5">
          The finder didn't confirm this one. If you think it's yours, message them
          or add more detail.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
      <p className="flex items-center gap-1.5 font-semibold">
        <ShieldCheck className="h-4 w-4" /> Claim under review
      </p>
      <p className="mt-0.5 text-amber-700">
        The finder will check your answer and get back to you.
      </p>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
