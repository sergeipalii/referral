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
  const [modalOpen, setModalOpen] = useState(false);
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
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (p: Partner) => {
    setEditing(p);
    setModalOpen(true);
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
                      <div className="font-medium">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {p.description}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {p.code}
                      </code>
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

      <PartnerModal
        open={modalOpen}
        partner={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
        error={error}
        setError={setError}
      />
    </DashboardShell>
  );
}

function PartnerModal({
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
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(partner?.name || '');
      setCode(partner?.code || '');
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
        await api.updatePartner(partner.id, { name, code, description });
      } else {
        await api.createPartner({ name, code, description });
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
          label="Code (UTM value)"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. partner-123"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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
