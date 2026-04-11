'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Th, Td } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { api, ApiError } from '@/lib/api';
import type {
  AnalyticsIntegration,
  SyncJob,
  PaginatedResponse,
} from '@/lib/types';

const syncStatusVariant = {
  running: 'blue' as const,
  completed: 'green' as const,
  failed: 'red' as const,
};

export default function AnalyticsPage() {
  const [integration, setIntegration] = useState<AnalyticsIntegration | null>(
    null,
  );
  const [integrationLoaded, setIntegrationLoaded] = useState(false);
  const [jobs, setJobs] = useState<PaginatedResponse<SyncJob> | null>(null);
  const [jobsPage, setJobsPage] = useState(1);
  const [setupOpen, setSetupOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [integ, j] = await Promise.all([
        api.getIntegration().catch(() => null),
        api.getSyncJobs({ page: jobsPage, limit: 10 }).catch(() => null),
      ]);
      setIntegration(integ);
      setJobs(j);
    } finally {
      setIntegrationLoaded(true);
    }
  }, [jobsPage]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (
      !confirm(
        'Remove analytics integration? This will not delete existing conversions.',
      )
    )
      return;
    await api.deleteIntegration();
    setIntegration(null);
  };

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold mb-6">Analytics Integration</h1>

      {/* Integration status */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Integration</h2>
          <div className="flex gap-2">
            {integration && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSyncOpen(true)}
                >
                  Trigger Sync
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete}>
                  Remove
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {!integrationLoaded ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : integration ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Provider:</span>{' '}
                <span className="font-medium capitalize">
                  {integration.providerType}
                </span>
              </div>
              <div>
                <span className="text-gray-500">UTM Parameter:</span>{' '}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  {integration.utmParameterName}
                </code>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <Badge variant={integration.isActive ? 'green' : 'gray'}>
                  {integration.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <span className="text-gray-500">Last Synced:</span>{' '}
                <span>
                  {integration.lastSyncedAt
                    ? new Date(integration.lastSyncedAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">
                No analytics integration configured.
              </p>
              <Button onClick={() => setSetupOpen(true)}>
                Set Up Integration
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sync Jobs */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Sync History</h2>
        </CardHeader>
        {jobs && jobs.data.length > 0 ? (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Status</Th>
                  <Th>Range</Th>
                  <Th>Events</Th>
                  <Th>Conversions</Th>
                  <Th>Completed</Th>
                  <Th>Error</Th>
                </tr>
              </Thead>
              <tbody className="divide-y divide-gray-200">
                {jobs.data.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50">
                    <Td>
                      <Badge variant={syncStatusVariant[j.status]}>
                        {j.status}
                      </Badge>
                    </Td>
                    <Td className="text-xs">
                      {new Date(j.rangeStart).toLocaleDateString()} -{' '}
                      {new Date(j.rangeEnd).toLocaleDateString()}
                    </Td>
                    <Td>{j.rawEventsCount}</Td>
                    <Td>{j.conversionsCount}</Td>
                    <Td>
                      {j.completedAt
                        ? new Date(j.completedAt).toLocaleString()
                        : '-'}
                    </Td>
                    <Td>
                      {j.errorMessage && (
                        <span className="text-xs text-red-600 truncate max-w-[200px] block">
                          {j.errorMessage}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {jobs.meta && (
              <Pagination meta={jobs.meta} onPageChange={setJobsPage} />
            )}
          </>
        ) : (
          <CardBody>
            <p className="text-sm text-gray-500 text-center py-4">
              No sync jobs yet.
            </p>
          </CardBody>
        )}
      </Card>

      <SetupModal
        open={setupOpen}
        integration={integration}
        onClose={() => setSetupOpen(false)}
        onSaved={() => {
          setSetupOpen(false);
          load();
        }}
        error={error}
        setError={setError}
      />

      <SyncModal
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        onSynced={() => {
          setSyncOpen(false);
          load();
        }}
        error={error}
        setError={setError}
      />
    </DashboardShell>
  );
}

function SetupModal({
  open,
  integration,
  onClose,
  onSaved,
  error,
  setError,
}: {
  open: boolean;
  integration: AnalyticsIntegration | null;
  onClose: () => void;
  onSaved: () => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [utmParam, setUtmParam] = useState('utm_source');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey('');
      setSecretKey('');
      setUtmParam(integration?.utmParameterName || 'utm_source');
      setProjectId('');
      setError('');
    }
  }, [open, integration, setError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.upsertIntegration({
        providerType: 'amplitude',
        apiKey,
        secretKey,
        utmParameterName: utmParam,
        projectId: projectId || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Up Amplitude Integration">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          label="API Key"
          required
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <Input
          label="Secret Key"
          required
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
        />
        <Input
          label="UTM Parameter Name"
          value={utmParam}
          onChange={(e) => setUtmParam(e.target.value)}
        />
        <Input
          label="Project ID (optional)"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SyncModal({
  open,
  onClose,
  onSynced,
  error,
  setError,
}: {
  open: boolean;
  onClose: () => void;
  onSynced: () => void;
  error: string;
  setError: (e: string) => void;
}) {
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRangeStart('');
      setRangeEnd('');
      setError('');
    }
  }, [open, setError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.triggerSync({
        rangeStart: rangeStart || undefined,
        rangeEnd: rangeEnd || undefined,
      });
      onSynced();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to trigger sync',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Trigger Sync">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <p className="text-sm text-gray-500">
          Leave empty to sync from last synced date (or last 30 days).
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Start Sync
          </Button>
        </div>
      </form>
    </Modal>
  );
}
