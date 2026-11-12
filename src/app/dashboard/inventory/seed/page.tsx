'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function SeedDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeedData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/seed-inventory', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: data.message,
          itemCount: data.itemCount,
        });
      } else {
        setError(data.error || 'Failed to seed data');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/inventory">
          <Button variant="outline">← Back to Inventory</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed Test Data</CardTitle>
          <CardDescription>
            Generate mock inventory items for testing. Only available outside production, for a workspace with no inventory items yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">What will be created:</h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>3 Raw Materials items (bolts, aluminum, wire)</li>
              <li>2 Work in Process items (molds, circuit boards)</li>
              <li>3 Finished Goods items (brackets, enclosures, oil)</li>
              <li>3 MRO Supplies items (gloves, cleaning, welding rods)</li>
              <li>Total: 12 sample items with realistic data</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">Test Features:</h3>
            <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
              <li>Some items are <strong>Low Stock</strong> to test alerts</li>
              <li>Various price ranges to test total value calculations</li>
              <li>Expiry dates on some items to test expiry tracking</li>
              <li>All categories represented for filtering tests</li>
              <li>Try Edit, Delete, and Stock Adjustments</li>
            </ul>
          </div>

          <Button
            onClick={handleSeedData}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Creating Mock Data...' : 'Generate 12 Sample Items'}
          </Button>

          {result && result.success && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">✓ Success!</h4>
              <p className="text-sm text-green-800 mb-2">{result.message}</p>
              <p className="text-sm text-green-700">
                Created {result.itemCount} inventory items. You can now:
              </p>
              <ul className="text-sm text-green-700 space-y-1 ml-4 list-disc mt-2">
                <li>Test the inventory listing and filtering</li>
                <li>Edit and update items</li>
                <li>Test stock adjustments and see the history</li>
                <li>Check low stock alerts</li>
                <li>Calculate total inventory value</li>
              </ul>
              <Link href="/dashboard/inventory" className="block mt-4">
                <Button className="w-full">Go to Inventory Management</Button>
              </Link>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-2">✗ Error</h4>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
