'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';

export default function FeedbackPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.submitFeedback({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        message: message.trim(),
      });
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not send feedback. Please try again later.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto w-full max-w-xl">
        <Link
          href="/"
          className="block text-center text-lg font-bold text-indigo-600 mb-8"
        >
          Referral System
        </Link>

        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Pilot mode
            </span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              Tell us what you think
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              We&apos;re running in pilot mode and rely on direct feedback to
              shape the product. Bugs, requests, confusion — all welcome.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                Thanks — your feedback was delivered. We read every message.
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setSent(false)}
                  className="flex-1"
                >
                  Send another
                </Button>
                <Link href="/" className="flex-1">
                  <Button className="w-full">Back to home</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Input
                label="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
              <Input
                label="Email (optional, so we can reply)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
              />
              <div>
                <label
                  htmlFor="feedback-message"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="feedback-message"
                  required
                  rows={6}
                  minLength={3}
                  maxLength={4000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="What worked, what didn't, what you'd love to see..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {message.length} / 4000
                </p>
              </div>
              <Button
                type="submit"
                loading={loading}
                disabled={message.trim().length < 3}
                className="w-full"
              >
                Send feedback
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          <Link href="/" className="hover:text-gray-700">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
