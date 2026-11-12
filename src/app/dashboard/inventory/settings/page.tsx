'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function InventorySettings() {
  const [settings, setSettings] = useState({
    defaultUnit: 'pcs',
    defaultCategory: 'Finished Goods',
    lowStockThreshold: '10',
    autoReorder: false,
  });

  // There is no storage for these preferences yet (InventorySetting only holds picklist values), so the
  // page does not pretend to save them. Picklists are managed in Inventory Setup.

  return (
    <div className="p-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/dashboard/inventory">
          <Button variant="outline">← Back to Inventory</Button>
        </Link>
        <h1 className="text-3xl font-bold">Inventory Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure default values and preferences for inventory management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultUnit">Default Unit</Label>
              <Input
                id="defaultUnit"
                value={settings.defaultUnit}
                onChange={(e) => setSettings({ ...settings, defaultUnit: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="defaultCategory">Default Category</Label>
              <Select
                value={settings.defaultCategory}
                onValueChange={(value) => setSettings({ ...settings, defaultCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                  <SelectItem value="Work in Process">Work in Process</SelectItem>
                  <SelectItem value="Finished Goods">Finished Goods</SelectItem>
                  <SelectItem value="MRO Supplies">MRO Supplies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
              <Input
                id="lowStockThreshold"
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => setSettings({ ...settings, lowStockThreshold: e.target.value })}
              />
              <p className="text-sm text-gray-500 mt-1">Items below this quantity will be marked as low stock.</p>
            </div>
          </div>

          <div>
            <Label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.autoReorder}
                onChange={(e) => setSettings({ ...settings, autoReorder: e.target.checked })}
              />
              <span>Enable Auto-Reorder</span>
            </Label>
            <p className="text-sm text-gray-500 mt-1">Automatically create reorder alerts when stock falls below reorder point.</p>
          </div>

          <p className="text-sm text-amber-700">
            These preferences are not saved yet. To manage units, categories and other picklists, use{' '}
            <Link href="/dashboard/inventory/setup" className="underline">Inventory Setup</Link>.
          </p>
          <Button disabled>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}