import "./env.js";

// utils
import { sendNotification, fetchClearance, wait, logger, handle } from "./utils.js";

const MONITOR_DELAY = Number(process.env.MONITOR_DELAY_MS);
const MONITOR_EANS: string[] = process.env.MONITOR_EANS ? process.env.MONITOR_EANS.split(",") : [];

const lastUpdateStore: { [ean: string]: string } = {};

async function monitorLoop() {
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

        if (MONITOR_EANS.includes(ean) && stock > 0) {
          if (lastUpdateStore[ean] !== lastUpdate) {
            const title = `"${description}" back in stock! ✅`;
            const message = `🏪 Store: ${storeName}\n📦 Stock: ${stock}\n🏷️ Price: ${newPrice} (${originalPrice}) DKK\n🕗 Updated At: ${lastUpdate} \n⚡ Created At: ${startTime}`;

            const [error, _] = await handle(sendNotification(title, message));

            if (error) return logger.error(error.message, `Failed to send notification.`);

            lastUpdateStore[ean] = lastUpdate;

            break;
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

  monitorLoop();
}

main();
