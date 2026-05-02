'use client';

import { BatchesManager } from './components';

export default function BatchesPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <BatchesManager />
      </div>
    </div>
  );
}
