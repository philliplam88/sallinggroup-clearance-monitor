import "./env.js";

// utils
import { sendNotification, fetchClearance, wait, logger, handle, startOfDay, fDate } from "./utils.js";

const MONITOR_DELAY = Number(process.env.MONITOR_DELAY_MS);
const MONITOR_EANS: string[] = process.env.MONITOR_EANS ? process.env.MONITOR_EANS.split(",") : [];
const SEEN_EANS = new Set<string>();

async function startMonitor() {
  /* Reset EANS every 24 hour */
  setInterval(() => {
    logger.info(undefined, `Cleaning ${SEEN_EANS.size} seen eans.`);
    SEEN_EANS.clear();
  }, startOfDay());

  /* Monitor loop */
  while (true) {
    await monitorClearanceItems();
    await wait(MONITOR_DELAY);
  }
}

async function monitorClearanceItems() {
  try {
    const [error, stores] = await handle(fetchClearance(process.env.MONITOR_ZIP_CODE));

    if (error) return logger.error(error.message, `Failed to fetch clearance.`);

    for (const store of stores) {
      for (const clearance of store.clearances) {
        const { stock, lastUpdate, startTime, newPrice, discount, originalPrice, percentDiscount } = clearance.offer;
        const { ean, description } = clearance.product;
        const { name: storeName } = store.store;

        const isPresentDay = new Date(startTime).toDateString() === new Date().toDateString();

        if (MONITOR_EANS.includes(ean) && stock > 0 && isPresentDay) {
          if (!SEEN_EANS.has(ean)) {
            SEEN_EANS.add(ean);

            const title = `"${description}" product created! ✅`;
            const message = `🏪 Store: ${storeName}\n📦 Stock: ${stock}\n🏷️ Price: ${newPrice} (${originalPrice}) DKK\n🕗 Created At: ${fDate(startTime)}`;

            logger.warn(undefined, `New product! ${description}`);

            // logger.warn({ storeName, product: description, stock, price: originalPrice, startTime }, title);

            const [error, _] = await handle(sendNotification(title, message));

            if (error) return logger.error(error.message, `Failed to send notification.`);
          }
        }
      }
    }

    logger.info(`Completed monitoring for ${stores.length} stores!`);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : error, `Failed to monitor clearance.`);
  }
}

async function main() {
  logger.info(
    {
      stage: process.env.NODE_ENV || "development",
      monitor_delay: Number(process.env.MONITOR_DELAY_MS),
    },
    `Starting monitor...`
  );

  startMonitor();
}

main();
