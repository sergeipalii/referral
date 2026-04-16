'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { api, ApiError } from '@/lib/api';
import type {
  Partner,
  PaginatedResponse,
  PartnerInvitationCreated,
} from '@/lib/types';

/** Derived status shown in the Account column. */
type AccountStatus = 'none' | 'pending' | 'expired' | 'accepted';

function getAccountStatus(p: Partner): AccountStatus {
  if (p.hasPassword) return 'accepted';
  if (!p.email) return 'none';
  if (
    p.invitationExpiresAt &&
    new Date(p.invitationExpiresAt).getTime() > Date.now()
  ) {
    return 'pending';
  }
  return 'expired';
}

function buildInviteUrl(token: string): string {
  // Prefer current window origin so the link points at whichever host the
  // owner is currently using (handy for dev + prod environments).
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : '';
  return `${origin}/partner/accept-invite?token=${token}`;
}

export default function PartnersPage() {
  const [data, setData] = useState<PaginatedResponse<Partner> | null>(null);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Partner | null>(null);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [inviting, setInviting] = useState<Partner | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await api.getPartners({ page, limit: 20 });
    setData(res);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => setCreateOpen(true);
  const openView = (p: Partner) => setViewing(p);
  const openEdit = (p: Partner) => {
    setViewing(null);
    setEditing(p);
  };
  const openInvite = (p: Partner) => {
    setViewing(null);
    setInviting(p);
  };

  const handleDelete = async (p: Partner) => {
    if (!confirm(`Deactivate partner "${p.name}"?`)) return;
    await api.deletePartner(p.id);
    load();
  };

  const handleRevoke = async (p: Partner) => {
    if (!confirm(`Revoke pending invitation for "${p.name}"?`)) return;
    await api.revokePartnerInvitation(p.id);
    load();
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Partners</h1>
        <Button onClick={openCreate}>Add Partner</Button>
      </div>

      <Card>
        {data && data.data.length > 0 ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Code</Th>
                  <Th>Status</Th>
                  <Th>Account</Th>
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((p) => {
                  const account = getAccountStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <Td>
                        <button
                          type="button"
                          onClick={() => openView(p)}
                          className="font-medium text-left hover:text-blue-600"
                        >
                          {p.name}
                        </button>
                        {p.description && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <CopyableCode code={p.code} />
                      </Td>
                      <Td>
                        <Badge variant={p.isActive ? 'green' : 'gray'}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td>
                        <AccountBadge status={account} email={p.email} />
                      </Td>
                      <Td>{new Date(p.createdAt).toLocaleDateString()}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openView(p)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(p)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openInvite(p)}
                          >
                            {account === 'none' ? 'Invite' : 'Re-invite'}
                          </Button>
                          {account === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(p)}
                            >
                              Revoke
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p)}
                          >
                            Delete
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {data.meta && (
              <Pagination meta={data.meta} onPageChange={setPage} />
            )}
          </>
        ) : data ? (
          <EmptyState
            title="No partners yet"
            description="Create your first referral partner to get started."
            action={<Button onClick={openCreate}>Add Partner</Button>}
          />
        ) : null}
      </Card>

      <PartnerFormModal
        open={createOpen || editing !== null}
        partner={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setCreateOpen(false);
          setEditing(null);
          load();
        }}
        error={error}
        setError={setError}
      />

      <PartnerDetailsModal
        partner={viewing}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
        onInvite={openInvite}
      />

      <InvitePartnerModal
        partner={inviting}
        onClose={() => setInviting(null)}
        onSaved={() => {
          setInviting(null);
          load();
        }}
      />
    </DashboardShell>
  );
}

function AccountBadge({
  status,
  email,
}: {
  status: AccountStatus;
  email: string | null;
}) {
  const map: Record<AccountStatus, { label: string; variant: string }> = {
    none: { label: 'No account', variant: 'gray' },
    pending: { label: 'Invited', variant: 'blue' },
    expired: { label: 'Expired', variant: 'red' },
    accepted: { label: 'Active', variant: 'green' },
  };
  const { label, variant } = map[status];
  return (
    <div className="space-y-0.5">
      <Badge variant={variant as 'gray' | 'blue' | 'red' | 'green'}>
        {label}
      </Badge>
      {email && (
        <div className="text-xs text-gray-500 truncate max-w-[180px]">
          {email}
        </div>
      )}
    </div>
  );
}

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable (e.g. insecure context) — fail silently
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className="inline-flex items-center gap-1.5 group"
    >
      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-gray-200">
        {code}
      </code>
      <span className="text-xs text-gray-400 group-hover:text-gray-600">
        {copied ? 'Copied!' : 'Copy'}
      </span>
    </button>
  );
}

function PartnerDetailsModal({
  partner,
  onClose,
  onEdit,
  onInvite,
}: {
  partner: Partner | null;
  onClose: () => void;
  onEdit: (p: Partner) => void;
  onInvite: (p: Partner) => void;
}) {
  return (
    <Modal
      open={partner !== null}
      onClose={onClose}
      title={partner ? `Partner: ${partner.name}` : ''}
    >
      {partner && (
        <div className="space-y-4">
          <DetailRow label="Name" value={partner.name} />
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Code</div>
            <CopyableCode code={partner.code} />
          </div>
          <DetailRow
            label="Description"
            value={partner.description || '—'}
          />
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">
              Status
            </div>
            <Badge variant={partner.isActive ? 'green' : 'gray'}>
              {partner.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">
              Portal account
            </div>
            <AccountBadge
              status={getAccountStatus(partner)}
              email={partner.email}
            />
          </div>
          {partner.payoutDetails &&
          Object.keys(partner.payoutDetails).length > 0 ? (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                Payout details
              </div>
              <pre className="bg-gray-50 border rounded p-2 text-xs text-gray-900 whitespace-pre-wrap break-all">
                {JSON.stringify(partner.payoutDetails, null, 2)}
              </pre>
              <p className="text-xs text-gray-500 mt-1">
                Set by the partner in their portal settings.
              </p>
            </div>
          ) : (
            <DetailRow
              label="Payout details"
              value="— (partner hasn't provided yet)"
            />
          )}
          {partner.lastLoginAt && (
            <DetailRow
              label="Last sign-in"
              value={new Date(partner.lastLoginAt).toLocaleString()}
            />
          )}
          <DetailRow
            label="Created"
            value={new Date(partner.createdAt).toLocaleString()}
          />
          <DetailRow
            label="Updated"
            value={new Date(partner.updatedAt).toLocaleString()}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="secondary" onClick={() => onInvite(partner)}>
              {getAccountStatus(partner) === 'none' ? 'Invite' : 'Re-invite'}
            </Button>
            <Button onClick={() => onEdit(partner)}>Edit</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

function PartnerFormModal({
  open,
  partner,
  onClose,
  onSaved,
  error,
  setError,
}: {
  open: boolean;
  partner: Partner | null;
  onClose: () => void;
  onSaved: () => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(partner?.name || '');
      setDescription(partner?.description || '');
      setError('');
    }
  }, [open, partner, setError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (partner) {
        await api.updatePartner(partner.id, { name, description });
      } else {
        await api.createPartner({ name, description });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={partner ? 'Edit Partner' : 'Create Partner'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {partner && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">
              Code (auto-generated, not editable)
            </div>
            <CopyableCode code={partner.code} />
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {partner ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Two-step modal:
 *   1. Owner enters (or confirms) the partner's email.
 *   2. On submit, backend returns a one-time token; we show the full
 *      accept-invite URL with a Copy button so the owner can paste it into
 *      whatever channel they use (email, Telegram, Slack).
 */
function InvitePartnerModal({
  partner,
  onClose,
  onSaved,
}: {
  partner: Partner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState('');
  const [created, setCreated] = useState<PartnerInvitationCreated | null>(
    null,
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (partner) {
      setEmail(partner.email || '');
      setCreated(null);
      setError('');
    }
  }, [partner]);

  if (!partner) return null;

  const isReinvite = getAccountStatus(partner) !== 'none';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.createPartnerInvitation(partner.id, email);
      setCreated(res);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create invitation',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — user can still select manually
    }
  };

  const handleDone = () => {
    setCreated(null);
    setEmail('');
    onSaved();
  };

  return (
    <Modal
      open={partner !== null}
      onClose={created ? handleDone : onClose}
      title={
        created
          ? 'Invitation created'
          : isReinvite
            ? `Re-invite ${partner.name}`
            : `Invite ${partner.name}`
      }
    >
      {created ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              Share this link with the partner. It&apos;s shown only once and
              expires{' '}
              <strong>
                {new Date(created.expiresAt).toLocaleString()}
              </strong>
              .
            </p>
            <div className="space-y-2">
              <div>
                <div className="text-xs font-medium text-yellow-700 mb-1">
                  Invitation link
                </div>
                <code className="block text-xs bg-white border border-yellow-300 rounded p-3 break-all select-all">
                  {buildInviteUrl(created.token)}
                </code>
              </div>
              <div>
                <div className="text-xs font-medium text-yellow-700 mb-1">
                  Partner email
                </div>
                <code className="block text-xs bg-white border border-yellow-300 rounded p-3 break-all select-all">
                  {created.email}
                </code>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => handleCopy(buildInviteUrl(created.token))}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {isReinvite && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              This will generate a new invitation link. Any previously issued
              link becomes invalid.
              {partner.hasPassword &&
                ' The current password stays valid until the partner uses the new link to set a fresh one.'}
            </div>
          )}
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@example.com"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Generate invitation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
