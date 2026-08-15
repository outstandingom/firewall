import supabase from '../lib/supabase.js';

export async function aggregateHourlyMetrics(siteId: string, hourStart: Date) {
  // Mock implementation
  // Would query events, compute sums, and upsert to hourly_metrics table
  console.log(`Aggregating hourly metrics for ${siteId} at ${hourStart.toISOString()}`);
}

export async function aggregateDailyMetrics(siteId: string, dayStart: Date) {
  console.log(`Aggregating daily metrics for ${siteId} at ${dayStart.toISOString()}`);
}
