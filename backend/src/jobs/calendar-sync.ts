import {
  syncAllCalendarImports,
} from "../controllers/calendar.controller.js";

/*
|--------------------------------------------------------------------------
| Calendar Sync Job
|--------------------------------------------------------------------------
|
| Periodically fetches external iCal/ICS calendar feeds (Airbnb,
| Booking.com, etc.) and updates property availability blocks in
| FarmStayGo's database.
|
| Runs shortly after startup, then on a fixed interval.
| The interval defaults to 15 minutes.
|
*/

export const startCalendarSyncJob = (
  intervalMs?: number
): void => {
  const resolvedInterval =
    intervalMs ??
    (Number(process.env.CALENDAR_SYNC_INTERVAL) ||
      2 * 60 * 1000);

  const run = () => {
    void syncAllCalendarImports();
  };

  // Run shortly after startup to sync on server start.
  setTimeout(run, 5_000);

  setInterval(
    run,
    resolvedInterval
  );

  console.log(
    `[calendarSync] job started (interval: ${Math.round(
      resolvedInterval / 1000
    )}s / ${(resolvedInterval / 60000).toFixed(1)}min)`
  );
};
