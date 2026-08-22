import { cleanupExpiredHolds } from "../controllers/booking.controller.js";

// Periodically removes expired unpaid ONLINE deposit "holds" so they don't
// linger as dead booking rows. Runs once at startup and then on an interval.
export const startBookingCleanupJob = (
  intervalMs = 60 * 1000
): void => {
  const run = () => {
    void cleanupExpiredHolds();
  };

  // Run shortly after startup.
  setTimeout(run, 5000);

  setInterval(run, intervalMs);

  console.log(
    `[bookingCleanup] started (interval: ${Math.round(
      intervalMs / 1000
    )}s)`
  );
};
