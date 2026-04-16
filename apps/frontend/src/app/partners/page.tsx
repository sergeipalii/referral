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
import type { Partner, PaginatedResponse } from '@/lib/types';

export default function PartnersPage() {
  const [data, setData] = useState<PaginatedResponse<Partner> | null>(null);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Partner | null>(null);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await api.getPartners({ page, limit: 20 });
    setData(res);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setCreateOpen(true);
  };
  const openView = (p: Partner) => {
    setViewing(p);
  };
  const openEdit = (p: Partner) => {
    setViewing(null);
    setEditing(p);
  };

  const handleDelete = async (p: Partner) => {
    if (!confirm(`Deactivate partner "${p.name}"?`)) return;
    await api.deletePartner(p.id);
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
                  <Th>Created</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((p) => (
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
                    <Td>{new Date(p.createdAt).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
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
                          onClick={() => handleDelete(p)}
                        >
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
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
      />
    </DashboardShell>
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
}: {
  partner: Partner | null;
  onClose: () => void;
  onEdit: (p: Partner) => void;
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
            <div className="text-xs font-medium text-gray-500 mb-1">Status</div>
            <Badge variant={partner.isActive ? 'green' : 'gray'}>
              {partner.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
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
