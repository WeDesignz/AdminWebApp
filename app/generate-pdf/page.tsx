'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PDFClientsAPI } from '@/lib/api/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentTextIcon, ArrowPathIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

type PDFClient = {
  id: number;
  name: string;
};

type JobStatus = {
  id: number;
  client: number;
  client_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  designs_per_pdf: number;
  requested_pdfs: number;
  generated_pdfs: number;
  total_designs_requested: number;
  total_designs_used: number;
  progress_percent: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export default function GeneratePDFPage() {
  const { hasRole } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [searchClient, setSearchClient] = useState('');
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [numberOfPdfs, setNumberOfPdfs] = useState(1);
  const [activeJob, setActiveJob] = useState<JobStatus | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);

  const isSuperAdmin = hasRole('Super Admin');

  // Fetch PDF clients
  const { data: clientsResponse, isLoading: clientsLoading } = useQuery({
    queryKey: ['pdfClients', searchClient],
    queryFn: async () => {
      const res = await PDFClientsAPI.getClients({
        search: searchClient || undefined,
      });
      return res;
    },
  });

  const clients: PDFClient[] =
    (clientsResponse?.data?.results as PDFClient[]) ||
    (clientsResponse?.data as any)?.results ||
    [];

  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: (payload: { name: string }) => PDFClientsAPI.createClient(payload),
    onSuccess: async () => {
      toast.success('Client created');
      setShowCreateClientModal(false);
      setNewClientName('');
      await queryClient.invalidateQueries({ queryKey: ['pdfClients'] });
    },
    onError: (error: any) => {
      const msg = error?.error || error?.message || 'Failed to create client';
      toast.error(msg);
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) {
        throw new Error('Please select a client');
      }
      const selectedClient = clients.find((c) => c.id === selectedClientId);
      const payload = {
        client_id: selectedClientId,
        number_of_pdfs: numberOfPdfs,
        designs_per_pdf: 100,
        customer_name: selectedClient?.name || '',
        customer_mobile: customerMobile.trim(),
      };
      const res = await PDFClientsAPI.createJob(payload, logoFile);
      return res;
    },
    onSuccess: async (response: any) => {
      const job: JobStatus =
        (response?.data as any) ||
        response?.data?.job ||
        response;
      setActiveJob(job);
      toast.success('PDF generation started');
      await queryClient.invalidateQueries({ queryKey: ['pdfClientJobs'] });
    },
    onError: (error: any) => {
      const msg = error?.error || error?.message || 'Failed to start PDF generation';
      toast.error(msg);
    },
  });

  // Poll job status when activeJob exists
  const { refetch: refetchJobStatus } = useQuery({
    queryKey: ['pdfClientJobStatus', activeJob?.id],
    enabled: !!activeJob,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      const status = data?.data?.status || data?.status;
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
    queryFn: async () => {
      if (!activeJob) return null;
      const res = await PDFClientsAPI.getJobStatus(activeJob.id);
      const job: JobStatus =
        (res?.data as any) ||
        res?.data?.job ||
        res;
      setActiveJob(job);
      return res;
    },
  });

  // Job history (filter by selected client when set)
  const { data: jobsResponse, isLoading: jobsLoading } = useQuery({
    queryKey: ['pdfClientJobs', selectedClientId],
    queryFn: async () => {
      const res = await PDFClientsAPI.getJobs({
        client_id: selectedClientId ? Number(selectedClientId) : undefined,
        page: 1,
        page_size: 20,
      });
      return res;
    },
  });

  const jobHistory =
    (jobsResponse?.data as any)?.results ??
    (jobsResponse?.data as any)?.data?.results ??
    [];
  const totalJobs = (jobsResponse?.data as any)?.total_count ?? 0;

  const handleStartJob = async () => {
    if (!selectedClientId) {
      toast.error('Please select a client');
      return;
    }
    if (!customerMobile.trim()) {
      toast.error('Please enter customer mobile number');
      return;
    }
    if (numberOfPdfs < 1 || numberOfPdfs > 10) {
      toast.error('Number of PDFs must be between 1 and 10');
      return;
    }
    await createJobMutation.mutateAsync();
  };

  const handleDownloadZip = async () => {
    if (!activeJob || activeJob.status !== 'completed') return;
    await downloadJobZip(activeJob.id);
  };

  const downloadJobZip = async (jobId: number) => {
    try {
      setIsDownloading(true);
      const { blob, filename } = await PDFClientsAPI.downloadJobZip(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('ZIP downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to download ZIP');
    } finally {
      setIsDownloading(false);
    }
  };

  // Delete (cancel) a pending or failed job
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: number) => PDFClientsAPI.deleteJob(jobId),
    onMutate: (jobId) => setDeletingJobId(jobId),
    onSuccess: (_, jobId) => {
      if (activeJob?.id === jobId) setActiveJob(null);
      queryClient.invalidateQueries({ queryKey: ['pdfClientJobs'] });
      toast.success('Job deleted');
    },
    onError: (error: any) => {
      toast.error(error?.error || error?.message || 'Failed to delete job');
    },
    onSettled: () => setDeletingJobId(null),
  });

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Generate PDF</h1>
          <p className="text-muted-foreground">Access denied. This page is restricted to Super Admins only.</p>
        </div>
      </DashboardLayout>
    );
  }

  const currentProgress = activeJob?.progress_percent ?? 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <DocumentTextIcon className="w-6 h-6 text-primary" />
              Generate PDF for Clients
            </h1>
            <p className="text-muted-foreground mt-1">
              Create non-overlapping design PDFs for marketing clients. Each PDF contains 100 designs.
            </p>
          </div>
        </div>

        {/* Client selection + creation */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">PDF Client</label>
            <select
              className="border rounded-md px-3 py-2 bg-background"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value ? Number(e.target.value) : '')}
              disabled={clientsLoading}
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Search clients..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['pdfClients'] })}
              >
                <ArrowPathIcon className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setShowCreateClientModal(true)}
            >
              Add New Client
            </Button>
          </div>

          {/* Customer details */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer Mobile</label>
            <Input
              placeholder="Enter mobile number"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
            />
          </div>

          {/* PDF config */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Number of PDFs</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={numberOfPdfs}
              onChange={(e) => setNumberOfPdfs(Number(e.target.value || 1))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Each PDF contains <span className="font-semibold">100 designs</span>. Maximum 10 PDFs per job.
            </p>
            <label className="text-sm font-medium mt-3">Logo (optional)</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setLogoFile(file);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleStartJob}
            disabled={createJobMutation.isPending || !!(activeJob && activeJob.status !== 'failed' && activeJob.status !== 'completed')}
          >
            {createJobMutation.isPending ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Generate PDFs'
            )}
          </Button>
          {activeJob && (
            <span className="text-sm text-muted-foreground">
              Job #{activeJob.id} – Status: <span className="font-medium capitalize">{activeJob.status}</span>
            </span>
          )}
        </div>

        {/* Status card */}
        {activeJob && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border bg-card p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Job Progress</h2>
                  <p className="text-sm text-muted-foreground">
                    Client: <span className="font-medium">{activeJob.client_name}</span> · PDFs:{' '}
                    {activeJob.generated_pdfs}/{activeJob.requested_pdfs} · Designs used:{' '}
                    {activeJob.total_designs_used}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 shrink-0"
                  onClick={() => refetchJobStatus()}
                  disabled={!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed'}
                >
                  <ArrowPathIcon className="w-5 h-5" />
                </Button>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    activeJob.status === 'completed'
                      ? 'bg-emerald-500'
                      : activeJob.status === 'failed'
                      ? 'bg-red-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{currentProgress}%</span>
                <span className="capitalize">{activeJob.status}</span>
              </div>

              {activeJob.error_message && (
                <p className="text-sm text-red-500 mt-1">{activeJob.error_message}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadZip}
                  disabled={activeJob.status !== 'completed' || isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Download ZIP
                    </>
                  )}
                </Button>
                {(activeJob.status === 'pending' || activeJob.status === 'failed') && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                    onClick={() => deleteJobMutation.mutate(activeJob.id)}
                    disabled={deletingJobId === activeJob.id}
                  >
                    {deletingJobId === activeJob.id ? (
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TrashIcon className="w-4 h-4 mr-2" />
                    )}
                    Cancel job
                  </Button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Create client modal */}
        <Modal
          isOpen={showCreateClientModal}
          onClose={() => setShowCreateClientModal(false)}
          title="Add PDF Client"
        >
          <div className="space-y-4">
            <Input
              label="Client name"
              placeholder="Enter client name"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateClientModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newClientName.trim()) {
                    toast.error('Client name is required');
                    return;
                  }
                  createClientMutation.mutate({ name: newClientName.trim() });
                }}
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* History */}
        <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">History</h2>
          <p className="text-sm text-muted-foreground">
            {selectedClientId
              ? `Recent jobs for selected client (${totalJobs} total)`
              : 'Recent jobs across all clients'}
          </p>
          {jobsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Loading history...
            </div>
          ) : jobHistory.length === 0 ? (
            <p className="text-muted-foreground py-4">No jobs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Job #</th>
                    <th className="text-left py-2 font-medium">Client</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Created</th>
                    <th className="text-left py-2 font-medium">PDFs</th>
                    <th className="text-right py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobHistory.map((job: any) => (
                    <tr key={job.id} className="border-b last:border-0">
                      <td className="py-2">{job.id}</td>
                      <td className="py-2">{job.client_name ?? `Client ${job.client ?? job.client_id}`}</td>
                      <td className="py-2">
                        <span
                          className={`capitalize font-medium ${
                            job.status === 'completed'
                              ? 'text-emerald-600'
                              : job.status === 'failed'
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {job.created_at
                          ? new Date(job.created_at).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="py-2">
                        {job.generated_pdfs ?? 0}/{job.requested_pdfs ?? 0}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadJobZip(job.id)}
                              disabled={isDownloading}
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                              Download ZIP
                            </Button>
                          )}
                          {(job.status === 'pending' || job.status === 'failed') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                              onClick={() => deleteJobMutation.mutate(job.id)}
                              disabled={deletingJobId === job.id}
                            >
                              {deletingJobId === job.id ? (
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                              ) : (
                                <TrashIcon className="w-4 h-4 mr-1" />
                              )}
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

