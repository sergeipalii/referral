'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Card, CardBody } from '@/components/ui/card';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { api, ApiError } from '@/lib/api';
import type { ApiKey, ApiKeyCreated } from '@/lib/types';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const k = await api.getApiKeys();
    setKeys(k);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (k: ApiKey) => {
    if (!confirm(`Revoke API key "${k.name}"? This cannot be undone.`)) return;
    await api.deleteApiKey(k.id);
    load();
  };

  return (
    <DashboardShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage keys for programmatic access. Use the{' '}
            <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Create Key</Button>
      </div>

      <Card>
        {keys.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Prefix</Th>
                <Th>Last Used</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <tbody className="divide-y divide-gray-200">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <Td className="font-medium">{k.name}</Td>
                  <Td>
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                      {k.prefix}...
                    </code>
                  </Td>
                  <Td>
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleString()
                      : 'Never'}
                  </Td>
                  <Td>{new Date(k.createdAt).toLocaleDateString()}</Td>
                  <Td className="text-right">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(k)}
                    >
                      Revoke
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            title="No API keys"
            description="Create an API key to access the API programmatically."
            action={
              <Button onClick={() => setModalOpen(true)}>Create Key</Button>
            }
          />
        )}
      </Card>

      <CreateKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(k) => {
          setModalOpen(false);
          setTimeout(() => {
            setCreatedKey(k);
            load();
          }, 150);
        }}
        error={error}
        setError={setError}
      />

      {/* Show created key */}
      <Modal
        open={!!createdKey}
        onClose={() => setCreatedKey(null)}
        title="API Key Created"
      >
        {createdKey && (
          <div className="space-y-4">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Copy these values now. You won&apos;t be able to see them again.
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-yellow-700 mb-1">API Key</p>
                  <code className="block text-xs bg-white border border-yellow-300 rounded p-3 break-all select-all">
                    {createdKey.key}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-medium text-yellow-700 mb-1">Signing Secret (for HMAC)</p>
                  <code className="block text-xs bg-white border border-yellow-300 rounded p-3 break-all select-all">
                    {createdKey.signingSecret}
                  </code>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `API Key: ${createdKey.key}\nSigning Secret: ${createdKey.signingSecret}`,
                  );
                }}
              >
                Copy Both
              </Button>
              <Button onClick={() => setCreatedKey(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}

function CreateKeyModal({
  open,
  onClose,
  onCreated,
  error,
  setError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (key: ApiKeyCreated) => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setError('');
    }
  }, [open, setError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const key = await api.createApiKey(name);
      onCreated(key);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create API Key">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          label="Key Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Production, CI/CD"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
